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
    pairingCodeTimer?: ReturnType<typeof setTimeout>;
    lastConnectedAt?: Date;
    createdAt: Date;
    metadata?: any;
    pairingCodeRequested?: boolean;
    isReconnecting?: boolean; // FLAG pour éviter les reconnexions multiples
}

export type SessionStatus =
    | 'initializing'
    | 'qr_pending'
    | 'pairing_pending'
    | 'connected'
    | 'disconnected'
    | 'reconnecting'
    | 'logged_out'
    | 'error';

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY_MS = 5_000;
const MAX_RECONNECT_DELAY_MS = 60_000;

// ============================================================================
// GESTION DE LA MÉMOIRE
// ============================================================================

const globalForWhatsApp = globalThis as unknown as {
    sessionsMap: Map<string, SessionData>;
    ioInstance: Server;
};

export const sessions = globalForWhatsApp.sessionsMap || new Map<string, SessionData>();
if (process.env.NODE_ENV !== 'production') globalForWhatsApp.sessionsMap = sessions;

// ============================================================================
// UTILITAIRES
// ============================================================================

function reconnectDelay(attempt: number): number {
    return Math.min(BASE_RECONNECT_DELAY_MS * Math.pow(2, attempt), MAX_RECONNECT_DELAY_MS);
}

function setSessionStatus(sessionId: string, status: SessionStatus): void {
    const session = sessions.get(sessionId);
    if (session) {
        session.status = status;
        session.socket?.emit('session_status', { sessionId, status });
    }
}

function emitToSession(sessionId: string, event: string, data: unknown): void {
    const session = sessions.get(sessionId);
    if (session?.socket) {
        session.socket.emit(event, data);
    }
}

// ============================================================================
// FONCTIONS EXPORTÉES
// ============================================================================

export async function updateBlockStatus(sessionId: string, phone: string, action: 'block' | 'unblock') {
    const session = sessions.get(sessionId);

    if (!session || !session.sock) {
        throw new Error("WhatsApp n'est pas connecté");
    }

    const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;

    try {
        await session.sock.updateBlockStatus(jid, action);
        console.log(`🛡️ [${sessionId}] Contact ${phone} ${action === 'block' ? 'bloqué' : 'débloqué'}`);
    } catch (error) {
        console.error(`❌ [${sessionId}] Erreur ${action}:`, error);
        throw new Error("L'action a échoué");
    }
}

export async function cleanupSession(sessionId: string, deleteAuth = false, userId?: string): Promise<void> {
    const session = sessions.get(sessionId);
    if (!session) return;

    console.log(`🧹 [${sessionId}] Nettoyage session (deleteAuth: ${deleteAuth})`);

    // Nettoyer les timers
    if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
    if (session.pairingCodeTimer) clearTimeout(session.pairingCodeTimer);

    // Fermer le socket WhatsApp
    if (session.sock) {
        try {
            session.sock.end(undefined);
        } catch { /* ignore */ }
    }

    // Supprimer les clés de la BDD si demandé
    if (deleteAuth && userId) {
        try {
            const count = await prisma.whatsAppSession.deleteMany({
                where: { sessionId, userId }
            });
            console.log(`🗑️ [${sessionId}] ${count.count} clé(s) supprimée(s) de la BDD`);
        } catch (error) {
            console.error(`❌ [${sessionId}] Erreur suppression BDD:`, error);
        }
    }

    sessions.delete(sessionId);
    console.log(`✅ [${sessionId}] Session nettoyée`);
}

export function getUserSessions(userId: string): SessionData[] {
    return Array.from(sessions.values()).filter(s => s.realUserid === userId);
}

// ============================================================================
// INITIALISATION GLOBALE
// ============================================================================

export function initWhatsAppSocket(io: Server) {
    if (globalForWhatsApp.ioInstance) return;
    globalForWhatsApp.ioInstance = io;

    io.on('connection', (socket) => {
        console.log(`🔌 Client connecté: ${socket.id}`);

        socket.on('authenticate', async (data: { sessionId: string; realUserid: string }) => {
            const { sessionId, realUserid } = data;
            console.log(`🔐 Auth: ${sessionId.substring(0, 8)}... → user: ${realUserid.substring(0, 8)}...`);

            const existing = sessions.get(sessionId);
            if (existing) {
                if (existing.realUserid !== realUserid) {
                    console.error(`🚨 SÉCURITÉ: Tentative d'usurpation`);
                    socket.emit('whatsapp_event', {
                        type: 'error',
                        data: { message: 'Session invalide' }
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

            sessions.set(sessionId, {
                socketId: socket.id,
                realUserid,
                socket,
                status: 'initializing',
                reconnectAttempts: 0,
                createdAt: new Date(),
                metadata: {
                    ip: socket.handshake.headers['x-forwarded-for'] || socket.handshake.address,
                    userAgent: socket.handshake.headers['user-agent']
                }
            });
            socket.join(sessionId);
            socket.emit('authenticated', { success: true, sessionId, status: 'initializing' });

            // Vérifier si credentials existent
            const hasCreds = await prisma.whatsAppSession.findFirst({
                where: { sessionId, dataId: 'creds' },
                select: { id: true }
            });

            if (hasCreds) {
                console.log(`♻️ [${sessionId.substring(0, 8)}...] Credentials trouvées → reconnexion auto`);
                await initializeWhatsAppSession(socket, sessionId, 'qr', undefined, realUserid);
            }
        });

        socket.on('init_whatsapp', async (data: { sessionId: string; method: 'qr' | 'phone'; phone?: string; userId: string; }) => {
            const { sessionId, method, phone, userId } = data;

            try {
                const sessionData = sessions.get(sessionId);
                const realUserId = userId || sessionData?.realUserid;
                if (!realUserId) throw new Error('userId manquant');

                if (sessionData?.status === 'connected') {
                    socket.emit('whatsapp_event', {
                        type: 'already_connected',
                        data: { message: 'Déjà connecté' },
                    });
                    return;
                }

                console.log(`📱 [${sessionId.substring(0, 8)}...] Init: ${method}${phone ? ' → ' + phone : ''}`);
                await initializeWhatsAppSession(socket, sessionId, method, phone, realUserId);
            } catch (error) {
                console.error(`❌ Erreur init WhatsApp:`, error);
                socket.emit('whatsapp_event', {
                    type: 'error',
                    data: {
                        message: 'Erreur initialisation',
                        error: (error as Error).message
                    },
                });
            }
        });

        socket.on('logout_whatsapp', async (data: { sessionId: string }) => {
            const { sessionId } = data;
            const session = sessions.get(sessionId);
            if (!session) {
                socket.emit('whatsapp_event', { type: 'error', data: { message: 'Session introuvable' } });
                return;
            }

            console.log(`🚪 [${sessionId.substring(0, 8)}...] Déconnexion demandée`);

            try {
                if (session.sock) await session.sock.logout();
            } catch { /* ignore */ }

            await cleanupSession(sessionId, true, session.realUserid);
            socket.emit('whatsapp_event', { type: 'logged_out', data: { sessionId } });
        });

        socket.on('get_session_status', (data: { sessionId: string }) => {
            const session = sessions.get(data.sessionId);
            socket.emit('session_status', {
                sessionId: data.sessionId,
                status: session?.status ?? 'not_found',
                lastConnectedAt: session?.lastConnectedAt,
            });
        });

        socket.on('disconnect', (reason) => {
            console.log(`🔌 Déconnexion: ${socket.id} → ${reason}`);
            for (const [, session] of sessions.entries()) {
                if (session.socketId === socket.id) {
                    session.socketId = '';
                }
            }
        });
    });

    restorePersistedSessions(io).catch(console.error);
}

// ============================================================================
// INITIALISATION SESSION WHATSAPP
// ============================================================================

export async function initializeWhatsAppSession(
    socket: any,
    sessionId: string,
    method: 'qr' | 'phone',
    phone?: string,
    realUserid?: string,
): Promise<WASocket | undefined> {

    if (!realUserid) throw new Error("userId requis");

    const session = sessions.get(sessionId);
    if (!session) {
        console.error(`❌ Session ${sessionId} introuvable`);
        return;
    }

    // Éviter les initialisations multiples simultanées
    if (session.isReconnecting) {
        console.log(`⏭️ [${sessionId.substring(0, 8)}...] Déjà en cours de connexion, skip`);
        return;
    }

    session.isReconnecting = true;
    session.method = method;
    session.phone = phone;
    session.pairingCodeRequested = false;
    setSessionStatus(sessionId, 'initializing');

    try {
        // Enregistrement session DB
        const dbUser = await prisma.user.findUnique({
            where: { id: realUserid },
            select: { plan: true }
        });
        const userLimits = getUserLimits(dbUser?.plan || "FREE");

        await prisma.session.upsert({
            where: { sessionToken: sessionId },
            update: {
                expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                ipAddress: session.metadata?.ip || null,
                userAgent: session.metadata?.userAgent || 'WhatsApp Bot',
            },
            create: {
                sessionToken: sessionId,
                userId: realUserid,
                expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                ipAddress: session.metadata?.ip || null,
                userAgent: session.metadata?.userAgent || 'WhatsApp Bot',
            }
        });

        // Charger credentials depuis PostgreSQL
        const { state, saveCreds, removeAllData } = await usePrismaAuthState(sessionId, realUserid);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
            },
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }), // Réduire les logs Baileys
            browser: ['MyZapp', 'Chrome', '20.0.04'],
            connectTimeoutMs: 60_000,
            defaultQueryTimeoutMs: 0,
            keepAliveIntervalMs: 10_000,
            emitOwnEvents: true,
            syncFullHistory: !state.creds.registered,
            markOnlineOnConnect: true,
            getMessage: async (key) => {
                try {
                    const dbMsg = await prisma.message.findFirst({
                        where: { whatsappMessageId: key.id! },
                        select: { content: true }
                    });
                    return { conversation: dbMsg?.content || '' };
                } catch {
                    return { conversation: '' };
                }
            },
            retryRequestDelayMs: 250,
            maxMsgRetryCount: 5,
        });

        // Remplacer l'ancien socket
        if (session.sock) {
            try { session.sock.end(undefined); } catch { /* ignore */ }
        }
        session.sock = sock;
        session.isReconnecting = false;

        // ========================================================================
        // SAUVEGARDE CREDENTIALS
        // ========================================================================
        sock.ev.on('creds.update', async () => {
            try {
                await saveCreds();
            } catch (error) {
                console.error(`❌ [${sessionId.substring(0, 8)}...] Erreur sauvegarde creds:`, error);
            }
        });

        // ========================================================================
        // GESTION CONNEXION
        // ========================================================================
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            // QR CODE
            if (qr && method === 'qr') {
                setSessionStatus(sessionId, 'qr_pending');
                try {
                    const qrImage = await QRCode.toDataURL(qr, {
                        errorCorrectionLevel: 'M',
                        type: 'image/png',
                        margin: 1,
                        width: 300,
                    });
                    console.log(`📱 [${sessionId.substring(0, 8)}...] QR généré`);
                    emitToSession(sessionId, 'whatsapp_event', {
                        type: 'qr',
                        data: { qr: qrImage }
                    });
                } catch (error) {
                    console.error(`❌ Erreur génération QR:`, error);
                    emitToSession(sessionId, 'whatsapp_event', {
                        type: 'error',
                        data: { message: 'Erreur génération QR' },
                    });
                }
            }

            // CONNEXION RÉUSSIE
            if (connection === 'open' && realUserid) {
                console.log(`✅ [${sessionId.substring(0, 8)}...] WhatsApp connecté`);
                const s = sessions.get(sessionId);
                if (s) {
                    s.reconnectAttempts = 0;
                    s.lastConnectedAt = new Date();
                    s.pairingCodeRequested = false;
                    s.isReconnecting = false;
                }
                setSessionStatus(sessionId, 'connected');

                await syncUserProfile(sock, realUserid, sessionId);
            }

            // DÉCONNEXION
            if (connection === 'close') {
                const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
                const reason = DisconnectReason[statusCode as keyof typeof DisconnectReason] ?? 'Unknown';

                // Déconnexion définitive
                if (statusCode === DisconnectReason.loggedOut) {
                    console.log(`🚪 [${sessionId.substring(0, 8)}...] Déconnecté (logged out)`);
                    setSessionStatus(sessionId, 'logged_out');
                    emitToSession(sessionId, 'whatsapp_event', {
                        type: 'logged_out',
                        data: { reason, sessionId }
                    });

                    await cleanupSession(sessionId, true, realUserid);

                    try {
                        await prisma.session.deleteMany({ where: { sessionToken: sessionId } });
                        await removeAllData();
                    } catch (e) { /* ignore */ }

                    return;
                }

                const s = sessions.get(sessionId);
                if (!s || s.isReconnecting) return;

                // Tentatives de reconnexion
                if (s.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                    const delay = reconnectDelay(s.reconnectAttempts);
                    s.reconnectAttempts++;
                    setSessionStatus(sessionId, 'reconnecting');

                    console.log(`♻️ [${sessionId.substring(0, 8)}...] Tentative ${s.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} dans ${delay / 1000}s (${reason})`);

                    emitToSession(sessionId, 'whatsapp_event', {
                        type: 'reconnecting',
                        data: {
                            attempt: s.reconnectAttempts,
                            maxAttempts: MAX_RECONNECT_ATTEMPTS,
                            delayMs: delay,
                            reason
                        },
                    });

                    s.reconnectTimer = setTimeout(async () => {
                        try {
                            await initializeWhatsAppSession(socket, sessionId, method, phone, realUserid);
                        } catch (error) {
                            console.error(`❌ [${sessionId.substring(0, 8)}...] Échec reconnexion:`, error);
                            emitToSession(sessionId, 'whatsapp_event', {
                                type: 'error',
                                data: { message: 'Échec reconnexion' },
                            });
                        }
                    }, delay);
                } else {
                    console.error(`❌ [${sessionId.substring(0, 8)}...] Max tentatives atteintes → Abandon`);
                    setSessionStatus(sessionId, 'error');

                    emitToSession(sessionId, 'whatsapp_event', {
                        type: 'connection_failed',
                        data: {
                            message: 'Impossible de se connecter. Veuillez réessayer.',
                            reason
                        },
                    });

                    // Nettoyer les credentials corrompues
                    try {
                        await removeAllData();
                        console.log(`🗑️ [${sessionId.substring(0, 8)}...] Credentials corrompues supprimées`);
                    } catch { /* ignore */ }
                }
            }
        });

        // ========================================================================
        // CODE DE JUMELAGE
        // ========================================================================
        const isAlreadyRegistered = state.creds.registered;

        if (method === 'phone' && phone && !isAlreadyRegistered) {
            setSessionStatus(sessionId, 'pairing_pending');

            // Nettoyer l'ancien timer si existant
            if (session.pairingCodeTimer) {
                clearTimeout(session.pairingCodeTimer);
            }

            session.pairingCodeTimer = setTimeout(async () => {
                const currentSession = sessions.get(sessionId);

                if (!currentSession || currentSession.pairingCodeRequested) {
                    return;
                }

                currentSession.pairingCodeRequested = true;

                try {
                    const cleanPhone = phone.replace(/[^0-9]/g, '');

                    if (cleanPhone.length < 10) {
                        emitToSession(sessionId, 'whatsapp_event', {
                            type: 'error',
                            data: { message: 'Numéro invalide. Format: 237612345678' },
                        });
                        return;
                    }

                    console.log(`🔑 [${sessionId.substring(0, 8)}...] Demande code pour: ${cleanPhone}`);
                    const code = await sock.requestPairingCode(cleanPhone);
                    if (typeof code !== 'string') {
                        throw new Error("Le code de jumelage reçu n'est pas une chaîne de caractères");
                    }
                    console.log(`✅ [${sessionId.substring(0, 8)}...] Code généré: ${code}`);

                    emitToSession(sessionId, 'whatsapp_event', {
                        type: 'pairing_code',
                        data: {
                            code,
                            phone: cleanPhone,
                            formattedCode: code.match(/.{1,4}/g)?.join('-') || code
                        }
                    });
                } catch (error) {
                    console.error(`❌ [${sessionId.substring(0, 8)}...] Erreur code jumelage:`, error);
                    emitToSession(sessionId, 'whatsapp_event', {
                        type: 'error',
                        data: {
                            message: 'Impossible de générer le code',
                            hint: 'Vérifiez le numéro et réessayez'
                        },
                    });
                }
            }, 5_000);
        }

        // ========================================================================
        // HISTORIQUE
        // ========================================================================
        sock.ev.on('messaging-history.set', async ({ contacts, chats, messages }) => {
            console.log(`📦 [${sessionId.substring(0, 8)}...] Historique: ${contacts?.length || 0} contacts, ${chats?.length || 0} chats, ${messages?.length || 0} msgs`);

            if (!realUserid) return;

            try {
                if (contacts?.length) {
                    const result = await syncContacts(contacts as any, realUserid);
                    console.log(`📇 [${sessionId.substring(0, 8)}...] ${result.synced} contacts sync`);
                    emitToSession(sessionId, 'sync_progress', {
                        type: 'contacts',
                        status: 'completed',
                        synced: result.synced,
                        total: contacts.length
                    });
                }

                if (chats?.length) {
                    const result = await syncConversations(chats as any, realUserid);
                    console.log(`💬 [${sessionId.substring(0, 8)}...] ${(result as any).synced} chats sync`);
                    emitToSession(sessionId, 'sync_progress', {
                        type: 'conversations',
                        status: 'completed',
                        synced: (result as any).synced,
                        total: chats.length
                    });
                }

                if (messages?.length) {
                    const result = await syncMessages(messages as any, realUserid);
                    const broadcastResult = await syncBroadcasts(messages as any, realUserid);
                    console.log(`📨 [${sessionId.substring(0, 8)}...] ${result.synced} msgs + ${broadcastResult.created} broadcasts sync`);

                    emitToSession(sessionId, 'sync_progress', {
                        type: 'messages',
                        status: 'completed',
                        synced: result.synced,
                        total: messages.length
                    });
                }

                emitToSession(sessionId, 'whatsapp_event', {
                    type: 'sync_complete',
                    data: { message: 'Historique synchronisé' }
                });
            } catch (error) {
                console.error(`❌ [${sessionId.substring(0, 8)}...] Erreur synchro historique:`, error);
            }
        });

        // ========================================================================
        // TEMPS RÉEL
        // ========================================================================
        sock.ev.on('contacts.upsert', async (contacts) => {
            if (!realUserid) return;
            try {
                await syncContacts(contacts as any, realUserid);
                emitToSession(sessionId, 'contacts_updated', { type: 'realtime', action: 'upsert', count: contacts.length });
            } catch (error) {
                console.error(`❌ Erreur sync contacts:`, error);
            }
        });

        sock.ev.on('contacts.update', async (updates) => {
            if (!realUserid) return;
            try {
                await syncContacts(updates as any, realUserid);
                emitToSession(sessionId, 'contacts_updated', { type: 'realtime', action: 'update', count: updates.length });
            } catch (error) { /* ignore */ }
        });

        sock.ev.on('chats.upsert', async (chats) => {
            if (!realUserid) return;
            try {
                await syncConversations(chats as any, realUserid);
                emitToSession(sessionId, 'chats_updated', { type: 'realtime', action: 'upsert', count: chats.length });
            } catch (error) { /* ignore */ }
        });

        sock.ev.on('chats.update', async (updates) => {
            if (!realUserid) return;
            try {
                await syncConversations(updates as any, realUserid);
                emitToSession(sessionId, 'chats_updated', { type: 'realtime', action: 'update', count: updates.length });
            } catch (error) { /* ignore */ }
        });

        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (!realUserid || type !== 'notify') return;

            try {
                await syncMessages(messages as any, realUserid);

                // Commandes bot
                for (const msg of messages) {
                    if (msg.message) {
                        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

                        if (text.toLowerCase() === 'ping') {
                            await sock.sendMessage(msg.key.remoteJid!, {
                                text: '🏓 Pong! PostgreSQL Storage ✅'
                            });
                            console.log(`🏓 Pong envoyé`);
                        }

                        handleBotCommand(sock as WASocket, msg, realUserid).catch(console.error);
                    }
                }

                const incoming = messages.filter((m: proto.IWebMessageInfo) => !m.key?.fromMe && m.message);

                emitToSession(sessionId, 'messages_updated', {
                    type: 'realtime',
                    count: messages.length,
                    incomingCount: incoming.length,
                });
            } catch (error) { /* ignore */ }
        });

        sock.ev.on('messages.update', async (updates) => {
            try {
                for (const update of updates) {
                    if (update.key.id && update.update.status) {
                        if (update.update.status === 2) {
                            await updateMessageStatus(update.key.id, 'DELIVERY_ACK');
                        } else if (update.update.status >= 3) {
                            await updateMessageStatus(update.key.id, 'READ');
                        }
                    }
                }

                emitToSession(sessionId, 'messages_status_updated', {
                    type: 'realtime',
                    count: updates.length,
                });
            } catch (error) { /* ignore */ }
        });

        return sock;

    } catch (error) {
        console.error(`❌ [${sessionId.substring(0, 8)}...] Erreur critique init:`, error);
        session.isReconnecting = false;
        setSessionStatus(sessionId, 'error');

        emitToSession(sessionId, 'whatsapp_event', {
            type: 'error',
            data: {
                message: 'Erreur initialisation',
                error: (error as Error).message
            }
        });

        throw error;
    }
}

// ============================================================================
// SYNCHRONISATION PROFIL
// ============================================================================

async function syncUserProfile(sock: WASocket, realUserid: string, sessionId: string): Promise<void> {
    try {
        if (sock.user) {
            await syncUserData(sock.user as any, realUserid);
            console.log(`👤 [${sessionId.substring(0, 8)}...] Profil sync`);
        }

        emitToSession(sessionId, 'whatsapp_event', {
            type: 'connected',
            data: {
                user: sock.user,
                message: 'Connecté'
            }
        });
    } catch (error) {
        console.error(`❌ Erreur sync profil:`, error);
    }
}

// ============================================================================
// RESTAURATION
// ============================================================================

async function restorePersistedSessions(io: Server): Promise<void> {
    const activeSessions = await prisma.whatsAppSession.findMany({
        where: { dataId: 'creds' },
        select: {
            sessionId: true,
            userId: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 50 // Limiter pour éviter surcharge
    });

    if (!activeSessions.length) {
        console.log('📭 Aucune session persistée');
        return;
    }

    console.log(`🔁 Restauration de ${activeSessions.length} session(s)...`);

    for (const { sessionId, userId } of activeSessions) {
        const fakeSocket = {
            emit: (event: string, data: unknown) => { io.to(sessionId).emit(event, data); },
            join: (_room: string) => { }
        };

        sessions.set(sessionId, {
            socketId: '',
            realUserid: userId,
            socket: fakeSocket,
            status: 'initializing',
            reconnectAttempts: 0,
            createdAt: new Date()
        });

        try {
            await initializeWhatsAppSession(fakeSocket, sessionId, 'qr', undefined, userId);
        } catch (error) {
            console.error(`❌ Échec restauration ${sessionId.substring(0, 8)}...:`, error);
            sessions.delete(sessionId);
        }

        // Attendre 2s entre chaque session pour éviter rate limit
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`✅ Restauration terminée`);
}
