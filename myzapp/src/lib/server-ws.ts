// src/lib/server-ws.ts
import { Server, Socket } from 'socket.io';
import {
    makeWASocket,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    WASocket,
    proto,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';

import { usePrismaAuthState } from './usePrismaAuthState';
import { syncContacts } from '@/services/syncDB/contactSyncService';
import { syncUserData } from '@/services/syncDB/userSyncService';
import { syncConversations } from '@/services/syncDB/conversationSyncService';
import { syncMessages, updateMessageStatus } from '@/services/syncDB/messageSyncService';
import { syncBroadcasts } from '@/services/syncDB/broadcastSyncService';
import { prisma } from '@/lib/prisma';
import { handleBotCommand } from '@/services/bot/commandHandler';
import { getUserLimits } from "@/lib/permissions/planConfig";

// ============================================================================
// TYPES & CONSTANTES
// ============================================================================

export interface SessionData {
    socketId: string;
    realUserid: string;
    socket: Socket | any;
    sock?: WASocket;
    method?: 'qr' | 'phone';
    phone?: string;
    status: SessionStatus;
    reconnectAttempts: number;
    reconnectTimer?: ReturnType<typeof setTimeout>;
    lastConnectedAt?: Date;
    createdAt: Date;
    metadata?: any;
    pairingCodeRequested?: boolean;
    /**
     * TRUE uniquement quand WhatsApp a confirmé la connexion au moins une fois.
     * Empêche de supprimer les credentials sur une déconnexion temporaire.
     */
    hasEverConnected?: boolean;
    /**
     * Verrou pour éviter les initialisations simultanées (race condition).
     */
    isInitializing?: boolean;
}

export type SessionStatus =
    | 'initializing'
    | 'qr_pending'
    | 'pairing_pending'
    | 'connected'
    | 'disconnected'
    | 'reconnecting'
    | 'logged_out';

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY_MS = 5_000;
const MAX_RECONNECT_DELAY_MS = 60_000;

// ============================================================================
// MÉMOIRE GLOBALE (Compatible Hot Reload Next.js)
// ============================================================================

const globalForWhatsApp = globalThis as unknown as {
    sessionsMap: Map<string, SessionData>;
    ioInstance: Server | null;
};

export const sessions =
    globalForWhatsApp.sessionsMap ?? new Map<string, SessionData>();

if (process.env.NODE_ENV !== 'production') {
    globalForWhatsApp.sessionsMap = sessions;
}

// ============================================================================
// UTILITAIRES
// ============================================================================

function reconnectDelay(attempt: number): number {
    return Math.min(BASE_RECONNECT_DELAY_MS * Math.pow(2, attempt), MAX_RECONNECT_DELAY_MS);
}

function log(sessionId: string, level: 'info' | 'warn' | 'error', msg: string) {
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
    console[level === 'info' ? 'log' : level](`${prefix} [${sessionId.slice(0, 8)}…] ${msg}`);
}

function setSessionStatus(sessionId: string, status: SessionStatus): void {
    const session = sessions.get(sessionId);
    if (!session) return;
    session.status = status;
    session.socket?.emit('session_status', { sessionId, status });
}

function emitToSession(sessionId: string, event: string, data: unknown): void {
    const session = sessions.get(sessionId);
    session?.socket?.emit(event, data);
}

// ============================================================================
// FONCTIONS EXPORTÉES
// ============================================================================

export async function updateBlockStatus(
    sessionId: string,
    phone: string,
    action: 'block' | 'unblock',
) {
    const session = sessions.get(sessionId);
    if (!session?.sock) {
        throw new Error("WhatsApp n'est pas connecté.");
    }
    const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
    await session.sock.updateBlockStatus(jid, action);
}

/**
 * Nettoyage propre d'une session.
 * @param deleteAuth  Si true, supprime les credentials en BDD (déconnexion volontaire / loggedOut).
 *                    Ne JAMAIS passer true sur une déconnexion réseau temporaire.
 */
export async function cleanupSession(
    sessionId: string,
    deleteAuth = false,
    userId?: string,
): Promise<void> {
    const session = sessions.get(sessionId);
    if (!session) return;

    // Annuler le timer de reconnexion
    if (session.reconnectTimer) clearTimeout(session.reconnectTimer);

    // Fermer le socket Baileys proprement
    if (session.sock) {
        try { session.sock.end(undefined); } catch { /* ignore */ }
        session.sock = undefined;
    }

    if (deleteAuth && userId) {
        try {
            await prisma.whatsAppSession.deleteMany({ where: { sessionId, userId } });
            log(sessionId, 'info', 'Credentials supprimées de la BDD (logout volontaire)');
        } catch (e) {
            log(sessionId, 'error', `Erreur suppression credentials: ${e}`);
        }
    }

    sessions.delete(sessionId);
    log(sessionId, 'info', 'Session nettoyée');
}

export function getUserSessions(userId: string): SessionData[] {
    return [...sessions.values()].filter(s => s.realUserid === userId);
}

// ============================================================================
// INITIALISATION GLOBALE SOCKET.IO
// ============================================================================

export function initWhatsAppSocket(io: Server) {
    if (globalForWhatsApp.ioInstance) return;
    globalForWhatsApp.ioInstance = io;

    io.on('connection', (socket) => {
        console.log(`🔌 Client connecté : ${socket.id}`);

        // ── AUTHENTIFICATION ────────────────────────────────────────────────
        socket.on('authenticate', async (data: { sessionId: string; realUserid: string }) => {
            const { sessionId, realUserid } = data;
            log(sessionId, 'info', `Auth → user: ${realUserid.slice(0, 8)}…`);

            // Session déjà active : mettre à jour le socket client
            const existing = sessions.get(sessionId);
            if (existing) {
                if (existing.realUserid !== realUserid) {
                    socket.emit('whatsapp_event', {
                        type: 'error',
                        data: { message: 'Cette session appartient à un autre compte.' },
                    });
                    return;
                }
                existing.socketId = socket.id;
                existing.socket = socket;
                socket.join(sessionId);
                socket.emit('authenticated', {
                    success: true,
                    sessionId,
                    status: existing.status,
                    alreadyConnected: existing.status === 'connected',
                });
                return;
            }

            // Nouvelle session en mémoire
            sessions.set(sessionId, {
                socketId: socket.id,
                realUserid,
                socket,
                status: 'initializing',
                reconnectAttempts: 0,
                createdAt: new Date(),
                metadata: {
                    ip: socket.handshake.headers['x-forwarded-for'] || socket.handshake.address,
                    userAgent: socket.handshake.headers['user-agent'],
                },
            });
            socket.join(sessionId);
            socket.emit('authenticated', { success: true, sessionId, status: 'initializing' });

            // Reconnexion automatique si des credentials existent déjà
            const hasCreds = await prisma.whatsAppSession.findFirst({
                where: { sessionId, dataId: 'creds' },
                select: { id: true },
            });

            if (hasCreds) {
                log(sessionId, 'info', 'Credentials trouvées → reconnexion automatique');
                await initializeWhatsAppSession(socket, sessionId, 'qr', undefined, realUserid);
            }
        });

        // ── INITIALISATION WHATSAPP ─────────────────────────────────────────
        socket.on('init_whatsapp', async (data: {
            sessionId: string;
            method: 'qr' | 'phone';
            phone?: string;
            userId: string;
        }) => {
            const { sessionId, method, phone, userId } = data;
            try {
                const sessionData = sessions.get(sessionId);
                const realUserId = userId || sessionData?.realUserid;
                if (!realUserId) throw new Error('userId manquant');

                if (sessionData?.status === 'connected') {
                    socket.emit('whatsapp_event', {
                        type: 'already_connected',
                        data: { message: 'Session déjà active' },
                    });
                    return;
                }

                // Éviter double initialisation simultanée
                if (sessionData?.isInitializing) {
                    log(sessionId, 'warn', 'Initialisation déjà en cours, skip');
                    return;
                }

                log(sessionId, 'info', `Init WhatsApp → méthode: ${method}`);
                await initializeWhatsAppSession(socket, sessionId, method, phone, realUserId);
            } catch (error) {
                console.error('❌ Erreur init_whatsapp:', error);
                socket.emit('whatsapp_event', {
                    type: 'error',
                    data: { message: 'Erreur initialisation', error: (error as Error).message },
                });
            }
        });

        // ── DÉCONNEXION VOLONTAIRE ──────────────────────────────────────────
        socket.on('logout_whatsapp', async (data: { sessionId: string }) => {
            const { sessionId } = data;
            const session = sessions.get(sessionId);
            if (!session) {
                socket.emit('whatsapp_event', { type: 'error', data: { message: 'Session introuvable' } });
                return;
            }

            try { if (session.sock) await session.sock.logout(); } catch { /* ignore */ }

            await cleanupSession(sessionId, true, session.realUserid);

            try {
                await prisma.session.delete({ where: { sessionToken: sessionId } });
            } catch { /* ignore si absent */ }

            socket.emit('whatsapp_event', { type: 'logged_out', data: { sessionId } });
        });

        // ── STATUT ──────────────────────────────────────────────────────────
        socket.on('get_session_status', (data: { sessionId: string }) => {
            const session = sessions.get(data.sessionId);
            socket.emit('session_status', {
                sessionId: data.sessionId,
                status: session?.status ?? 'not_found',
                lastConnectedAt: session?.lastConnectedAt,
            });
        });

        // ── DÉCONNEXION CLIENT ──────────────────────────────────────────────
        socket.on('disconnect', (reason) => {
            console.log(`🔌 Déconnexion : ${socket.id} → ${reason}`);
            for (const session of sessions.values()) {
                if (session.socketId === socket.id) {
                    session.socketId = '';
                    // Ne pas toucher à la session WhatsApp, juste perdre la référence client
                }
            }
        });
    });

    restorePersistedSessions(io).catch(console.error);
}

// ============================================================================
// CŒUR : INITIALISATION SESSION WHATSAPP
// ============================================================================

export async function initializeWhatsAppSession(
    socket: any,
    sessionId: string,
    method: 'qr' | 'phone',
    phone?: string,
    realUserid?: string,
): Promise<WASocket | undefined> {

    if (!realUserid) throw new Error('realUserid requis');

    // ── Verrou anti-race-condition ─────────────────────────────────────────
    let session = sessions.get(sessionId);
    if (session?.isInitializing) {
        log(sessionId, 'warn', 'Initialisation déjà en cours, skip');
        return;
    }

    // Créer ou mettre à jour la session en mémoire
    if (!session) {
        session = {
            socketId: socket?.id ?? '',
            realUserid,
            socket,
            status: 'initializing',
            reconnectAttempts: 0,
            createdAt: new Date(),
        };
        sessions.set(sessionId, session);
    } else {
        session.socket = socket;
        session.method = method;
        session.phone = phone;
        session.pairingCodeRequested = false;
    }

    session.isInitializing = true;
    setSessionStatus(sessionId, 'initializing');

    // Fermer l'ancien socket Baileys si présent
    if (session.sock) {
        try { session.sock.end(undefined); } catch { /* ignore */ }
        session.sock = undefined;
    }

    // ── Enregistrement DB de la session utilisateur ────────────────────────
    try {
        const dbUser = await prisma.user.findUnique({
            where: { id: realUserid },
            select: { plan: true },
        });
        const userLimits = getUserLimits(dbUser?.plan || 'FREE');

        const activeDbSessions = await prisma.session.count({
            where: { userId: realUserid, userAgent: { contains: 'WhatsApp' } },
        });

        if (activeDbSessions >= userLimits.MAX_SESSIONS_PER_USER) {
            log(sessionId, 'warn', 'Limite de sessions atteinte pour cet utilisateur');
        }

        const ip = session.metadata?.ip ?? null;
        const ua = session.metadata?.userAgent ?? 'WhatsApp Bot';

        await prisma.session.upsert({
            where: { sessionToken: sessionId },
            update: {
                expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                ipAddress: ip,
                userAgent: ua,
            },
            create: {
                sessionToken: sessionId,
                userId: realUserid,
                expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                ipAddress: ip,
                userAgent: ua,
            },
        });
    } catch (dbError) {
        log(sessionId, 'error', `Erreur enregistrement session DB: ${dbError}`);
    }

    // ── Chargement credentials Baileys depuis PostgreSQL ───────────────────
    const { state, saveCreds, removeData } = await usePrismaAuthState(sessionId, realUserid);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        printQRInTerminal: false,
        logger: pino({ level: 'fatal' }),
        browser: ['MyZapp', 'Chrome', '20.0.04'],
        connectTimeoutMs: 60_000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 25_000,
        emitOwnEvents: true,
        syncFullHistory: !state.creds.registered,
        markOnlineOnConnect: true,
        getMessage: async (key) => {
            try {
                const dbMsg = await prisma.message.findFirst({
                    where: { whatsappMessageId: key.id! },
                    select: { content: true },
                });
                return { conversation: dbMsg?.content || '' };
            } catch {
                return { conversation: '' };
            }
        },
        retryRequestDelayMs: 250,
        maxMsgRetryCount: 5,
    });

    session.sock = sock;
    session.isInitializing = false;

    // ── Sauvegarde credentials ─────────────────────────────────────────────
    sock.ev.on('creds.update', async () => {
        try {
            await saveCreds();
        } catch (e) {
            log(sessionId, 'error', `Erreur sauvegarde credentials: ${e}`);
        }
    });

    // ── Gestion connexion ──────────────────────────────────────────────────
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // ── QR Code ──────────────────────────────────────────────────────
        if (qr && session?.method === 'qr') {
            setSessionStatus(sessionId, 'qr_pending');
            log(sessionId, 'info', 'QR généré');
            try {
                const qrImage = await QRCode.toDataURL(qr, {
                    errorCorrectionLevel: 'M',
                    type: 'image/png',
                    margin: 1,
                    width: 300,
                });
                emitToSession(sessionId, 'whatsapp_event', { type: 'qr', data: { qr: qrImage, message: 'Nouveau QR généré' } });
            } catch (e) {
                emitToSession(sessionId, 'whatsapp_event', {
                    type: 'error',
                    data: { message: 'Erreur génération QR', error: (e as Error).message },
                });
            }
        }

        // ── Connexion ouverte ─────────────────────────────────────────────
        if (connection === 'open') {
            log(sessionId, 'info', 'WhatsApp connecté ✅');
            const s = sessions.get(sessionId);
            if (s) {
                s.reconnectAttempts = 0;
                s.lastConnectedAt = new Date();
                s.pairingCodeRequested = false;
                s.hasEverConnected = true; // MARQUER : connexion confirmée
            }
            setSessionStatus(sessionId, 'connected');
            await syncUserProfile(sock, realUserid, sessionId);
        }

        // ── Déconnexion ───────────────────────────────────────────────────
        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
            const reason = DisconnectReason[statusCode as keyof typeof DisconnectReason] ?? 'Unknown';
            log(sessionId, 'warn', `Déconnecté : ${reason} (code ${statusCode})`);

            const s = sessions.get(sessionId);
            if (!s) return;

            // ── Logout confirmé par WhatsApp ──────────────────────────────
            if (statusCode === DisconnectReason.loggedOut) {
                setSessionStatus(sessionId, 'logged_out');
                emitToSession(sessionId, 'whatsapp_event', {
                    type: 'logged_out',
                    data: { reason, sessionId },
                });
                // Supprimer les credentials UNIQUEMENT sur logout réel
                await cleanupSession(sessionId, true, realUserid);
                try {
                    await prisma.session.delete({ where: { sessionToken: sessionId } });
                } catch { /* ignore */ }
                return;
            }

            // ── Credentials invalides / session expirée ───────────────────
            // Ces codes indiquent que re-scanner le QR est nécessaire.
            // On supprime les credentials corrompues uniquement dans ce cas.
            const invalidCredsCodes = [
                DisconnectReason.badSession,
                DisconnectReason.connectionReplaced,
                DisconnectReason.multideviceMismatch,
            ];

            if (invalidCredsCodes.includes(statusCode)) {
                log(sessionId, 'warn', `Credentials invalides (${reason}) → suppression et nouveau QR`);
                emitToSession(sessionId, 'whatsapp_event', {
                    type: 'session_expired',
                    data: {
                        message: 'Session expirée. Veuillez re-scanner le QR.',
                        reason,
                    },
                });
                // Supprimer credentials corrompues, puis repartir proprement
                await cleanupSession(sessionId, true, realUserid);
                // Recréer la session en mémoire pour permettre un nouveau scan
                sessions.set(sessionId, {
                    socketId: s.socketId,
                    realUserid,
                    socket: s.socket,
                    status: 'initializing',
                    reconnectAttempts: 0,
                    createdAt: new Date(),
                    metadata: s.metadata,
                });
                // Attendre un peu puis relancer
                setTimeout(async () => {
                    try {
                        await initializeWhatsAppSession(s.socket, sessionId, method, phone, realUserid);
                    } catch (e) {
                        log(sessionId, 'error', `Erreur relance après credentials invalides: ${e}`);
                    }
                }, 3_000);
                return;
            }

            // ── Déconnexion réseau temporaire → reconnexion avec backoff ──
            if (s.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                const delay = reconnectDelay(s.reconnectAttempts);
                s.reconnectAttempts++;
                setSessionStatus(sessionId, 'reconnecting');
                log(sessionId, 'info', `Reconnexion ${s.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} dans ${delay / 1000}s`);

                emitToSession(sessionId, 'whatsapp_event', {
                    type: 'reconnecting',
                    data: {
                        attempt: s.reconnectAttempts,
                        maxAttempts: MAX_RECONNECT_ATTEMPTS,
                        delayMs: delay,
                    },
                });

                s.reconnectTimer = setTimeout(async () => {
                    try {
                        // Ne PAS supprimer les credentials ici — juste reconnecter
                        await initializeWhatsAppSession(s.socket, sessionId, method, phone, realUserid);
                    } catch (e) {
                        log(sessionId, 'error', `Échec reconnexion: ${e}`);
                        emitToSession(sessionId, 'whatsapp_event', {
                            type: 'disconnected',
                            data: { reason: 'reconnection_failed', statusCode },
                        });
                    }
                }, delay);
            } else {
                // Max tentatives atteintes : ne pas supprimer les credentials !
                // L'utilisateur peut réessayer manuellement via l'UI.
                setSessionStatus(sessionId, 'disconnected');
                log(sessionId, 'warn', 'Max tentatives atteintes – session suspendue (credentials supprimés)');
                await prisma.session.delete({ where: { sessionToken: sessionId } });
                emitToSession(sessionId, 'whatsapp_event', {
                    type: 'disconnected',
                    data: {
                        reason: 'max_reconnect_attempts_reached',
                        statusCode,
                        canRetry: true,
                    },
                });
            }
        }
    });

    // ── Code de jumelage (méthode phone) ──────────────────────────────────
    if (method === 'phone' && phone && !state.creds.registered) {
        setSessionStatus(sessionId, 'pairing_pending');

        // Attendre que le socket soit prêt (connection établie avec les serveurs WA)
        setTimeout(async () => {
            const currentSession = sessions.get(sessionId);
            if (!currentSession || currentSession.pairingCodeRequested) {
                return;
            }
            currentSession.pairingCodeRequested = true;

            const cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone.length < 10) {
                emitToSession(sessionId, 'whatsapp_event', {
                    type: 'error',
                    data: { message: "Numéro invalide. Incluez l'indicatif pays (ex: 237612345678)" },
                });
                return;
            }

            try {
                log(sessionId, 'info', `Demande code de jumelage pour: ${cleanPhone}`);
                const code = await sock.requestPairingCode(cleanPhone);
                log(sessionId, 'info', `Code de jumelage généré: ${code}`);
                emitToSession(sessionId, 'whatsapp_event', {
                    type: 'pairing_code',
                    data: {
                        code,
                        phone: cleanPhone,
                        formattedCode: code.match(/.{1,4}/g)?.join('-') ?? code,
                    },
                });
            } catch (e) {
                log(sessionId, 'error', `Erreur code de jumelage: ${e}`);
                emitToSession(sessionId, 'whatsapp_event', {
                    type: 'error',
                    data: {
                        message: 'Impossible de générer le code de jumelage',
                        error: (e as Error).message,
                        hint: "Vérifiez que le numéro est correct et qu'il a WhatsApp installé",
                    },
                });
            }
        }, 5_000);
    }

    // ── Historique initial ─────────────────────────────────────────────────
    sock.ev.on('messaging-history.set', async ({ contacts, chats, messages }) => {
        log(sessionId, 'info',
            `Historique: ${contacts?.length ?? 0} contacts, ${chats?.length ?? 0} chats, ${messages?.length ?? 0} messages`);
        if (!realUserid) return;

        try {
            if (contacts?.length) {
                const r = await syncContacts(contacts as any, realUserid);
                emitToSession(sessionId, 'sync_progress', {
                    type: 'contacts', status: 'completed', synced: r.synced, total: contacts.length,
                });
            }
            if (chats?.length) {
                const r = await syncConversations(chats as any, realUserid);
                emitToSession(sessionId, 'sync_progress', {
                    type: 'conversations', status: 'completed', synced: (r as any).synced, total: chats.length,
                });
            }
            if (messages?.length) {
                const r = await syncMessages(messages as any, realUserid);
                const br = await syncBroadcasts(messages as any, realUserid);
                emitToSession(sessionId, 'sync_progress', {
                    type: 'messages', status: 'completed', synced: r.synced, broadcasts: br.created, total: messages.length,
                });
            }
            emitToSession(sessionId, 'whatsapp_event', {
                type: 'sync_complete',
                data: { message: 'Historique synchronisé avec succès' },
            });
        } catch (e) {
            log(sessionId, 'error', `Erreur sync historique: ${e}`);
        }
    });

    // ── Contacts temps réel ────────────────────────────────────────────────
    sock.ev.on('contacts.upsert', async (contacts) => {
        if (!realUserid) return;
        try {
            const r = await syncContacts(contacts as any, realUserid);
            emitToSession(sessionId, 'contacts_updated', { type: 'realtime', action: 'upsert', count: r.synced });
        } catch (e) { log(sessionId, 'error', `Erreur sync contacts: ${e}`); }
    });

    sock.ev.on('contacts.update', async (updates) => {
        if (!realUserid) return;
        try {
            const r = await syncContacts(updates as any, realUserid);
            emitToSession(sessionId, 'contacts_updated', { type: 'realtime', action: 'update', count: r.synced });
        } catch (e) { log(sessionId, 'error', `Erreur update contacts: ${e}`); }
    });

    // ── Conversations temps réel ───────────────────────────────────────────
    sock.ev.on('chats.upsert', async (chats) => {
        if (!realUserid) return;
        try {
            const r = await syncConversations(chats as any, realUserid);
            emitToSession(sessionId, 'chats_updated', { type: 'realtime', action: 'upsert', count: (r as any).synced });
        } catch (e) { log(sessionId, 'error', `Erreur sync conversations: ${e}`); }
    });

    sock.ev.on('chats.update', async (updates) => {
        if (!realUserid) return;
        try {
            const r = await syncConversations(updates as any, realUserid);
            emitToSession(sessionId, 'chats_updated', { type: 'realtime', action: 'update', count: (r as any).synced });
        } catch (e) { log(sessionId, 'error', `Erreur update conversations: ${e}`); }
    });

    // ── Messages temps réel ────────────────────────────────────────────────
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (!realUserid) return;
        try {
            await syncMessages(messages as any, realUserid);

            for (const msg of messages) {
                if (msg.message) {
                    const text =
                        msg.message.conversation ||
                        msg.message.extendedTextMessage?.text || '';

                    if (text.toLowerCase() === 'ping') {
                        await sock.sendMessage(msg.key.remoteJid!, {
                            text: '🏓 Pong! Bot actif ✅',
                        });
                    }

                    handleBotCommand(sock as WASocket, msg, realUserid).catch(console.error);
                }
            }

            const incoming = messages.filter(
                (m: proto.IWebMessageInfo) => !m.key?.fromMe && m.message,
            );

            emitToSession(sessionId, 'messages_updated', {
                type: 'realtime',
                action: 'upsert',
                count: messages.length,
                incomingCount: incoming.length,
                messages: incoming.map((m: proto.IWebMessageInfo) => ({
                    id: m.key?.id,
                    from: m.key?.remoteJid,
                    timestamp: m.messageTimestamp,
                    content:
                        m.message?.conversation ||
                        m.message?.extendedTextMessage?.text ||
                        '[Media]',
                })),
            });
        } catch (e) {
            log(sessionId, 'error', `Erreur sync messages: ${e}`);
        }
    });

    sock.ev.on('messages.update', async (updates) => {
        try {
            for (const update of updates) {
                if (update.key.id && update.update.status !== undefined) {
                    if (update.update.status === 2) {
                        await updateMessageStatus(update.key.id, 'DELIVERY_ACK');
                    } else if ((update.update.status || 0) >= 3) {
                        await updateMessageStatus(update.key.id, 'READ');
                    }
                }
            }
            emitToSession(sessionId, 'messages_status_updated', {
                type: 'realtime', count: updates.length,
            });
        } catch (e) {
            log(sessionId, 'error', `Erreur update statut messages: ${e}`);
        }
    });

    return sock;
}

// ============================================================================
// SYNCHRONISATION PROFIL UTILISATEUR
// ============================================================================

async function syncUserProfile(
    sock: WASocket,
    realUserid: string,
    sessionId: string,
): Promise<void> {
    try {
        emitToSession(sessionId, 'sync_progress', {
            type: 'user', status: 'in_progress', message: 'Synchronisation profil…',
        });

        if (sock.user) {
            await syncUserData(sock.user as any, realUserid);
            log(sessionId, 'info', 'Profil synchronisé');
            emitToSession(sessionId, 'sync_progress', {
                type: 'user', status: 'completed', message: 'Profil synchronisé',
            });
        }

        emitToSession(sessionId, 'whatsapp_event', {
            type: 'connected',
            data: { user: sock.user, message: 'WhatsApp connecté' },
        });
    } catch (e) {
        log(sessionId, 'error', `Erreur sync profil: ${e}`);
        emitToSession(sessionId, 'sync_progress', {
            type: 'user', status: 'error', message: 'Erreur synchronisation profil',
        });
    }
}

// ============================================================================
// RESTAURATION DES SESSIONS AU DÉMARRAGE
// ============================================================================

async function restorePersistedSessions(io: Server): Promise<void> {
    const activeSessions = await prisma.whatsAppSession.findMany({
        where: { dataId: 'creds' },
        select: { sessionId: true, userId: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
    });

    if (!activeSessions.length) {
        console.log('📭 Aucune session persistée trouvée en BDD');
        return;
    }

    console.log(`🔁 Restauration de ${activeSessions.length} session(s) depuis PostgreSQL…`);

    for (const { sessionId, userId } of activeSessions) {
        // Éviter les doublons si la session est déjà en mémoire
        if (sessions.has(sessionId)) {
            log(sessionId, 'info', 'Déjà en mémoire, skip restauration');
            continue;
        }

        const fakeSocket = {
            id: `server_${sessionId}`,
            emit: (event: string, data: unknown) => io.to(sessionId).emit(event, data),
            join: (_room: string) => { },
        };

        sessions.set(sessionId, {
            socketId: '',
            realUserid: userId,
            socket: fakeSocket,
            status: 'initializing',
            reconnectAttempts: 0,
            createdAt: new Date(),
        });

        try {
            await initializeWhatsAppSession(fakeSocket, sessionId, 'qr', undefined, userId);
            log(sessionId, 'info', 'Session restaurée avec succès');
        } catch (e) {
            log(sessionId, 'error', `Échec restauration: ${e}`);
            sessions.delete(sessionId);
        }
    }

    console.log('✅ Restauration terminée');
}
