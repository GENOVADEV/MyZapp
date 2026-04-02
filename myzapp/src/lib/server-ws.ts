// src/lib/server-ws.ts
import { Server, Socket } from 'socket.io';
import {
    makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    WASocket,
    proto,
} from '@whiskeysockets/baileys';
import makeInMemoryStore from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';

// Import des services de synchronisation
import { syncContacts } from '@/services/syncDB/contactSyncService';
import { syncUserData } from '@/services/syncDB/userSyncService';
import { syncConversations } from '@/services/syncDB/conversationSyncService';
import { syncMessages, updateMessageStatus } from '@/services/syncDB/messageSyncService';
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
    store?: ReturnType<typeof makeInMemoryStore>;
    authFolder?: string;
    method?: 'qr' | 'phone';
    phone?: string;
    status: SessionStatus;
    reconnectAttempts: number;
    reconnectTimer?: ReturnType<typeof setTimeout>;
    lastConnectedAt?: Date;
    createdAt: Date;
    metadata?: any;
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

const SESSION_REGISTRY_PATH = path.join(process.cwd(), 'whatsapp_sessions', 'registry.json');

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
// REGISTRY PERSISTANT
// ============================================================================

function loadRegistry(): Record<string, string> {
    try {
        if (fs.existsSync(SESSION_REGISTRY_PATH)) {
            return JSON.parse(fs.readFileSync(SESSION_REGISTRY_PATH, 'utf8'));
        }
    } catch { /* ignore */ }
    return {};
}

function saveRegistry(registry: Record<string, string>): void {
    try {
        fs.mkdirSync(path.dirname(SESSION_REGISTRY_PATH), { recursive: true });
        fs.writeFileSync(SESSION_REGISTRY_PATH, JSON.stringify(registry, null, 2));
    } catch (error) {
        console.error('❌ Erreur sauvegarde registry:', error);
    }
}

export function getSessionIdForUser(userId: string): string | null {
    return loadRegistry()[userId] ?? null;
}

function registerSession(userId: string, sessionId: string): void {
    const registry = loadRegistry();
    registry[userId] = sessionId;
    saveRegistry(registry);
}

function unregisterSession(userId: string): void {
    const registry = loadRegistry();
    delete registry[userId];
    saveRegistry(registry);
}

export function getUserSessions(userId: string): SessionData[] {
    const userSessions: SessionData[] = [];
    for (const session of sessions.values()) {
        if (session.realUserid === userId) {
            userSessions.push(session);
        }
    }
    return userSessions;
}

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
        throw new Error("Impossible de modifier le blocage : WhatsApp n'est pas connecté.");
    }

    const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;

    try {
        await session.sock.updateBlockStatus(jid, action);
        console.log(`🛡️ Contact ${phone} ${action === 'block' ? 'bloqué' : 'débloqué'} sur WhatsApp.`);
    } catch (error) {
        console.error(`❌ Erreur lors du ${action} sur WhatsApp:`, error);
        throw new Error("L'action a échoué sur les serveurs WhatsApp.");
    }
}

export function cleanupSession(sessionId: string, deleteAuthFiles = false): void {
    const session = sessions.get(sessionId);
    if (!session) return;

    if (session.reconnectTimer) clearTimeout(session.reconnectTimer);

    if (session.sock) {
        try { session.sock.end(undefined); } catch { /* ignore */ }
    }

    if (deleteAuthFiles && session.authFolder && fs.existsSync(session.authFolder)) {
        try {
            fs.rmSync(session.authFolder, { recursive: true, force: true });
            console.log(`🧹 Dossier session supprimé: ${session.authFolder}`);
        } catch (error) {
            console.error('Erreur suppression dossier auth:', error);
        }
        unregisterSession(session.realUserid);
    }

    sessions.delete(sessionId);
    console.log(`🗑️  Session nettoyée: ${sessionId}`);
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
            console.log(`🔐 Authentification session: ${sessionId}, utilisateur: ${realUserid}`);

            const existing = sessions.get(sessionId);
            if (existing) {
                if (existing.realUserid !== realUserid) {
                    console.error(`🚨 SÉCURITÉ: L'utilisateur ${realUserid} a tenté d'usurper la session de ${existing.realUserid}`);
                    socket.emit('whatsapp_event', {
                        type: 'error',
                        data: { message: 'Cette session WhatsApp appartient à un autre compte.' }
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

            const authFolder = path.join(process.cwd(), 'whatsapp_sessions', sessionId);
            if (fs.existsSync(path.join(authFolder, 'creds.json'))) {
                console.log(`♻️  Auth existante détectée pour ${sessionId} – reconnexion automatique...`);
                await initializeWhatsAppSession(socket, sessionId, 'qr', undefined, realUserid);
            }
        });

        socket.on('init_whatsapp', async (data: { sessionId: string; method: 'qr' | 'phone'; phone?: string; userId: string; }) => {
            const { sessionId, method, phone, userId } = data;
            try {
                const sessionData = sessions.get(sessionId);
                const realUserId = userId || sessionData?.realUserid;
                if (!realUserId) throw new Error('realUserid manquant');

                if (sessionData?.status === 'connected') {
                    socket.emit('whatsapp_event', {
                        type: 'already_connected',
                        data: { message: 'Session déjà active' },
                    });
                    return;
                }

                console.log(`📱 Initialisation WhatsApp: ${method} pour ${sessionId}, user: ${realUserId}`);
                await initializeWhatsAppSession(socket, sessionId, method, phone, realUserId);
            } catch (error) {
                console.error('❌ Erreur initialisation WhatsApp:', error);
                socket.emit('whatsapp_event', {
                    type: 'error',
                    data: { message: 'Erreur initialisation WhatsApp', error: (error as Error).message },
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

            try {
                if (session.sock) await session.sock.logout();
            } catch { /* ignore */ }

            cleanupSession(sessionId, true);
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
            console.log(`🔌 Client déconnecté: ${socket.id}, raison: ${reason}`);
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
    const authFolder = path.join(process.cwd(), 'whatsapp_sessions', sessionId);

    if (!fs.existsSync(authFolder)) {
        fs.mkdirSync(authFolder, { recursive: true });
    }

    const session = sessions.get(sessionId);
    if (session) {
        session.method = method;
        session.phone = phone;
        session.authFolder = authFolder;
        setSessionStatus(sessionId, 'initializing');
    }

    // Sauvegarde en DB
    if (realUserid) {
        try {
            const dbUser = await prisma.user.findUnique({ where: { id: realUserid }, select: { plan: true } });
            const userLimits = getUserLimits(dbUser?.plan || "FREE");

            const ipAddress = session?.metadata?.ip || null;
            const userAgent = session?.metadata?.userAgent || 'WhatsApp Bot';

            const activeDbSessions = await prisma.session.count({
                where: {
                    userId: realUserid,
                    userAgent: { contains: 'WhatsApp' }
                }
            });

            if (activeDbSessions >= userLimits.MAX_SESSIONS_PER_USER) {
                console.warn(`⚠️ L'utilisateur ${realUserid} a atteint la limite de sessions DB.`);
            }

            await prisma.session.upsert({
                where: { sessionToken: sessionId },
                update: {
                    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    ipAddress: ipAddress,
                    userAgent: userAgent,
                },
                create: {
                    sessionToken: sessionId,
                    userId: realUserid,
                    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    ipAddress: ipAddress,
                    userAgent: userAgent,
                }
            });
            console.log(`💾 Session ${sessionId} enregistrée en DB pour le user ${realUserid}`);
        } catch (dbError) {
            console.error(`❌ Erreur lors de l'enregistrement de la session en DB:`, dbError);
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version } = await fetchLatestBaileysVersion();
    let store = session?.store;
    if (!store || typeof (store as any).bind !== 'function') {
    const store = makeInMemoryStore({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        logger: pino({ level: 'silent' })
    });}


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
        keepAliveIntervalMs: 10_000,
        emitOwnEvents: true,
        syncFullHistory: false, // IMPORTANT: Active la synchro complète
        markOnlineOnConnect: true,
        getMessage: async (key) => {
            // Petite magie : si Baileys a besoin d'un ancien message, il le cherche dans le store
            return (await (store as any).loadMessage(key.remoteJid!, key.id!))?.message || { conversation: '' }
        }, retryRequestDelayMs: 250,
        maxMsgRetryCount: 5,
    });

    (store as any)?.bind(sock.ev);

    if (session) {
        if (session.sock) {
            try { session.sock.end(undefined); } catch { /* ignore */ }
        }
        session.sock = sock;
        session.store = store;
    }

    sock.ev.on('creds.update', async () => {
        try {
            await saveCreds();
        } catch (error) {
            console.error('Erreur sauvegarde credentials:', error);
        }
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        console.log(`🔄 [${sessionId}] Connection update – status: ${connection ?? 'n/a'}, QR: ${!!qr}`);

        if (qr && method === 'qr') {
            setSessionStatus(sessionId, 'qr_pending');
            try {
                const qrImage = await QRCode.toDataURL(qr, {
                    errorCorrectionLevel: 'M', type: 'image/png', margin: 1, width: 300,
                });
                emitToSession(sessionId, 'whatsapp_event', { type: 'qr', data: { qr: qrImage } });
            } catch (error) {
                emitToSession(sessionId, 'whatsapp_event', {
                    type: 'error', data: { message: 'Erreur génération QR', error: (error as Error).message },
                });
            }
        }

        if (connection === 'open' && realUserid) {
            console.log(`✅ [${sessionId}] WhatsApp connecté`);
            const s = sessions.get(sessionId);
            if (s) {
                s.reconnectAttempts = 0;
                s.lastConnectedAt = new Date();
            }
            setSessionStatus(sessionId, 'connected');
            registerSession(realUserid, sessionId);

            // Lancer la synchronisation complète
            await runSyncSequence(socket, sessionId, sock, realUserid);
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
            const reason = DisconnectReason[statusCode as keyof typeof DisconnectReason] ?? 'Unknown';
            console.log(`❌ [${sessionId}] WhatsApp déconnecté: ${reason} (${statusCode})`);

            if (statusCode === DisconnectReason.loggedOut) {
                setSessionStatus(sessionId, 'logged_out');
                emitToSession(sessionId, 'whatsapp_event', { type: 'logged_out', data: { reason, sessionId } });
                cleanupSession(sessionId, true);

                if (realUserid) {
                    try {
                        await prisma.session.delete({ where: { sessionToken: sessionId } });
                    } catch (e) { console.error("Erreur suppression DB", e) }
                }
                return;
            }

            const s = sessions.get(sessionId);
            if (!s) return;

            if (s.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                const delay = reconnectDelay(s.reconnectAttempts);
                s.reconnectAttempts++;
                setSessionStatus(sessionId, 'reconnecting');
                console.log(`♻️  [${sessionId}] Tentative ${s.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} dans ${delay / 1000}s...`);
                emitToSession(sessionId, 'whatsapp_event', {
                    type: 'reconnecting', data: { attempt: s.reconnectAttempts, maxAttempts: MAX_RECONNECT_ATTEMPTS, delayMs: delay },
                });

                s.reconnectTimer = setTimeout(async () => {
                    try {
                        await initializeWhatsAppSession(socket, sessionId, method, phone, realUserid);
                    } catch (error) {
                        console.error(`❌ [${sessionId}] Échec reconnexion:`, error);
                        emitToSession(sessionId, 'whatsapp_event', {
                            type: 'disconnected', data: { reason: 'reconnection_failed', statusCode },
                        });
                    }
                }, delay);
            } else {
                setSessionStatus(sessionId, 'disconnected');
                console.error(`❌ [${sessionId}] Max tentatives de reconnexion atteintes`);
                emitToSession(sessionId, 'whatsapp_event', {
                    type: 'disconnected', data: { reason: 'max_reconnect_attempts_reached', statusCode },
                });
            }
        }
    });

    // ============================================================================
    // ÉCOUTE DE L'HISTORIQUE WHATSAPP
    // ============================================================================
    sock.ev.on('messaging-history.set', async ({ contacts, chats, messages, isLatest }) => {
        console.log(`📦 [${sessionId}] Réception de l'historique : ${contacts?.length || 0} contacts, ${chats?.length || 0} conversations, ${messages?.length || 0} messages.`);

        if (!realUserid) return;

        try {
            if (contacts && contacts.length > 0) {
                const result = await syncContacts(contacts as any, realUserid);
                console.log(`📇 Historique: ${result.synced} contacts enregistrés en base.`);
                emitToSession(sessionId, 'contacts_updated', { synced: result.synced, total: contacts.length });
            }

            if (chats && chats.length > 0) {
                await syncConversations(chats as any, realUserid);
                console.log(`💬 Historique: Conversations enregistrées en base.`);
            }

            if (messages?.length) {
                const msgResult = await syncMessages(messages as any, realUserid);
                console.log(`📨 Historique: ${msgResult.synced} messages enregistrés.`);
            }
        } catch (error) {
            console.error(`❌ Erreur lors de la synchro de l'historique:`, error);
        }
    });

    // ============================================================================
    // TEMPS RÉEL - CONTACTS
    // ============================================================================
    sock.ev.on('contacts.upsert', async (contacts) => {
        if (!realUserid) return;
        try {
            const result = await syncContacts(contacts as any, realUserid);
            console.log(`📇 Temps réel: ${result.synced} contacts mis à jour`);
            emitToSession(sessionId, 'contacts_updated', {
                type: 'contacts_upsert', synced: result.synced, total: result.stats.total,
            });
        } catch (error) {
            console.error(`❌ [${sessionId}] Erreur sync contacts temps réel:`, error);
        }
    });

    // ============================================================================
    // TEMPS RÉEL - CONVERSATIONS
    // ============================================================================
    sock.ev.on('chats.upsert', async (chats) => {
        if (!realUserid) return;
        try {
            const result = await syncConversations(chats as any, realUserid);
            console.log(`💬 Temps réel: ${(result as any).synced} conversations mises à jour`);
            emitToSession(sessionId, 'chats_updated', {
                type: 'chats_upsert', synced: (result as any).synced, total: (result as any).stats.total,
            });
        } catch (error) {
            console.error(`❌ [${sessionId}] Erreur sync conversations temps réel:`, error);
        }
    });

    // ============================================================================
    // TEMPS RÉEL - MESSAGES
    // ============================================================================
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (!realUserid) return;

        try {
            // Sauvegarder TOUS les messages (entrants ET sortants)
            await syncMessages(messages as any, realUserid);
            console.log(`📨 Temps réel: ${messages.length} message(s) synchronisé(s)`);

            for (const msg of messages) {
                // On s'assure que le message vient bien de nous-même (vu qu'on contrôle notre propre bot)
                // Ou d'un contact si tu veux que d'autres personnes utilisent tes commandes
                if (msg.message) {
                    // On envoie le message au Routeur sans bloquer le reste (pas de await bloquant)
                    handleBotCommand(sock as WASocket, msg, realUserid).catch(console.error);
                }
            }
            
            // Filtrer les messages entrants pour la notification frontend
            const incoming = messages.filter((m: proto.IWebMessageInfo) => !m.key?.fromMe && m.message);

            emitToSession(sessionId, 'messages_updated', {
                type: 'messages_upsert',
                count: messages.length,
                incomingCount: incoming.length,
                messages: incoming.map((m: proto.IWebMessageInfo) => ({
                    id: m.key?.id,
                    from: m.key?.remoteJid,
                    timestamp: m.messageTimestamp,
                    type: Object.keys(m.message ?? {})[0] ?? 'unknown',
                })),
            });
        } catch (error) {
            console.error(`❌ [${sessionId}] Erreur sync messages temps réel:`, error);
        }
    });

    // ============================================================================
    // TEMPS RÉEL - STATUT MESSAGES
    // ============================================================================
    sock.ev.on('messages.update', async (updates) => {
        try {
            for (const update of updates) {
                if (update.key.id && update.update.status) {
                    if (update.update.status === 2) {
                        await updateMessageStatus(update.key.id, 'DELIVERED');
                    } else if (update.update.status >= 3) {
                        await updateMessageStatus(update.key.id, 'READ');
                    }
                }
            }

            emitToSession(sessionId, 'messages_status_updated', {
                type: 'messages_update',
                updates: updates.map((u) => ({
                    id: u.key.id,
                    remoteJid: u.key.remoteJid,
                    status: u.update.status,
                })),
            });
        } catch (error) {
            console.error(`❌ [${sessionId}] Erreur update statut message:`, error);
        }
    });

    // ============================================================================
    // PAIRING CODE
    // ============================================================================
    const isAlreadyRegistered = state.creds.registered;
    if (method === 'phone' && phone && !isAlreadyRegistered) {
        setSessionStatus(sessionId, 'pairing_pending');
        setTimeout(async () => {
            try {
                const cleanPhone = phone.replace(/[^0-9]/g, '');
                console.log(`🔑 [${sessionId}] Demande pairing code pour: ${cleanPhone}`);
                const code = await sock.requestPairingCode(cleanPhone);
                emitToSession(sessionId, 'whatsapp_event', { type: 'pairing_code', data: { code, phone: cleanPhone } });
            } catch (error) {
                emitToSession(sessionId, 'whatsapp_event', {
                    type: 'error', data: { message: 'Erreur code jumelage', error: (error as Error).message },
                });
            }
        }, 3_000);
    }

    return sock;
}

// ============================================================================
// SYNCHRONISATION COMPLÈTE
// ============================================================================

async function runSyncSequence(socket: any, sessionId: string, sock: WASocket, realUserid: string): Promise<void> {
    console.log(`🔄 [${sessionId}] Début de la synchronisation complète`);
    const startTime = Date.now();

    // 1. SYNCHRONISATION UTILISATEUR
    try {
        emitToSession(sessionId, 'sync_progress', {
            type: 'user',
            status: 'in_progress',
            message: 'Synchronisation du profil...',
            percentage: 0
        });

        if (sock.user) {
            await syncUserData(sock.user as any, realUserid);
            emitToSession(sessionId, 'sync_progress', {
                type: 'user',
                status: 'completed',
                message: 'Profil utilisateur synchronisé',
                percentage: 100
            });
            console.log(`👤 [${sessionId}] Profil synchronisé`);
        }
    } catch (error) {
        console.error(`❌ [${sessionId}] Erreur sync utilisateur:`, error);
        emitToSession(sessionId, 'sync_progress', {
            type: 'user',
            status: 'error',
            message: 'Erreur synchronisation profil',
            error: String(error)
        });
    }

    // 2. SYNCHRONISATION CONTACTS
    try {
        emitToSession(sessionId, 'sync_progress', {
            type: 'contacts',
            status: 'in_progress',
            message: 'Récupération des contacts...',
            percentage: 0
        });

        console.log(`📇 [${sessionId}] Récupération des contacts WhatsApp...`);
        const sessionStore = sessions.get(sessionId)?.store;

        // Méthode 1: Depuis le store (recommandé)
        let contactsArray: any[] = [];

        if ((sock as any).store?.contacts) {
            contactsArray = Object.values((sessionStore as any)?.contacts);
            console.log(`📇 [${sessionId}] ${contactsArray.length} contacts trouvés dans le store`);
        } else {
            // Méthode 2: Fetch direct
            try {
                const fetchedContacts = await (sock as any).fetchContacts?.();
                contactsArray = fetchedContacts || [];
                console.log(`📇 [${sessionId}] ${contactsArray.length} contacts récupérés via fetch`);
            } catch (fetchError) {
                console.warn(`⚠️ [${sessionId}] Impossible de récupérer les contacts:`, fetchError);
            }
        }

        if (contactsArray.length > 0) {
            // Synchroniser par lots de 50
            const batchSize = 50;
            let processedCount = 0;
            let totalSynced = 0;

            for (let i = 0; i < contactsArray.length; i += batchSize) {
                const batch = contactsArray.slice(i, i + batchSize);
                const contactResult = await syncContacts(batch, realUserid);

                processedCount += batch.length;
                totalSynced += contactResult.synced;
                const percentage = Math.round((processedCount / contactsArray.length) * 100);

                emitToSession(sessionId, 'sync_progress', {
                    type: 'contacts',
                    status: 'in_progress',
                    message: `Synchronisation contacts: ${processedCount}/${contactsArray.length}`,
                    synced: processedCount,
                    total: contactsArray.length,
                    percentage
                });
            }

            emitToSession(sessionId, 'sync_progress', {
                type: 'contacts',
                status: 'completed',
                message: `${totalSynced} contacts synchronisés`,
                synced: totalSynced,
                total: contactsArray.length,
                percentage: 100
            });
            console.log(`📇 [${sessionId}] ${totalSynced} contacts synchronisés`);
        } else {
            emitToSession(sessionId, 'sync_progress', {
                type: 'contacts',
                status: 'completed',
                message: 'Aucun contact à synchroniser',
                percentage: 100
            });
        }
    } catch (error) {
        console.error(`❌ [${sessionId}] Erreur sync contacts:`, error);
        emitToSession(sessionId, 'sync_progress', {
            type: 'contacts',
            status: 'error',
            message: 'Erreur synchronisation contacts',
            error: String(error)
        });
    }

    // 3. SYNCHRONISATION CONVERSATIONS
    try {
        emitToSession(sessionId, 'sync_progress', {
            type: 'conversations',
            status: 'in_progress',
            message: 'Récupération des conversations...',
            percentage: 0
        });

        console.log(`💬 [${sessionId}] Récupération des conversations WhatsApp...`);
        const sessionStore = sessions.get(sessionId)?.store;

        let chatsArray: any[] = [];

        if ((sessionStore as any)?.chats) {
            chatsArray = Object.values((sessionStore as any).chats.all()); // .all() est mieux pour les chats
            console.log(`💬 [${sessionId}] ${chatsArray.length} conversations trouvées dans le store`);
        } else {
            try {
                const fetchedChats = await (sock as any).fetchChats?.();
                chatsArray = fetchedChats || [];
                console.log(`💬 [${sessionId}] ${chatsArray.length} conversations récupérées via fetch`);
            } catch (fetchError) {
                console.warn(`⚠️ [${sessionId}] Impossible de récupérer les conversations:`, fetchError);
            }
        }

        if (chatsArray.length > 0) {
            const conversationResult = await syncConversations(chatsArray, realUserid);

            emitToSession(sessionId, 'sync_progress', {
                type: 'conversations',
                status: 'completed',
                message: `${conversationResult.synced} conversations synchronisées`,
                synced: conversationResult.synced,
                total: conversationResult.stats.total,
                percentage: 100
            });
            console.log(`💬 [${sessionId}] ${conversationResult.synced} conversations synchronisées`);
        } else {
            emitToSession(sessionId, 'sync_progress', {
                type: 'conversations',
                status: 'completed',
                message: 'Aucune conversation à synchroniser',
                percentage: 100
            });
        }
    } catch (error) {
        console.error(`❌ [${sessionId}] Erreur sync conversations:`, error);
        emitToSession(sessionId, 'sync_progress', {
            type: 'conversations',
            status: 'error',
            message: 'Erreur synchronisation conversations',
            error: String(error)
        });
    }

    // 4. SYNCHRONISATION MESSAGES RÉCENTS
    try {
        emitToSession(sessionId, 'sync_progress', {
            type: 'messages',
            status: 'in_progress',
            message: 'Synchronisation messages récents...',
            percentage: 0
        });

        console.log(`📨 [${sessionId}] Synchronisation messages récents...`);
        const sessionStore = sessions.get(sessionId)?.store;

        let messagesArray: any[] = [];

        if ((sessionStore as any)?.messages) {
            for (const jid in (sessionStore as any).messages) {
                const jidMessages = (sessionStore as any).messages[jid];
                if (jidMessages && typeof jidMessages === 'object') {
                    // Les messages dans le store sont souvent dans un objet "array" interne
                    messagesArray.push(...Object.values(jidMessages.array || jidMessages));
                }
            }
            console.log(`📨 [${sessionId}] ${messagesArray.length} messages trouvés dans le store`);
        }

        if (messagesArray.length > 0) {
            // Limiter aux 1000 messages les plus récents
            const recentMessages = messagesArray
                .sort((a: any, b: any) => {
                    const timeA = Number(a.messageTimestamp || 0);
                    const timeB = Number(b.messageTimestamp || 0);
                    return timeB - timeA;
                })
                .slice(0, 1000);

            const messageResult = await syncMessages(recentMessages, realUserid);

            emitToSession(sessionId, 'sync_progress', {
                type: 'messages',
                status: 'completed',
                message: `${messageResult.synced} messages synchronisés`,
                synced: messageResult.synced,
                total: recentMessages.length,
                percentage: 100
            });
            console.log(`📨 [${sessionId}] ${messageResult.synced} messages synchronisés`);
        } else {
            emitToSession(sessionId, 'sync_progress', {
                type: 'messages',
                status: 'completed',
                message: 'Aucun message à synchroniser',
                percentage: 100
            });
        }
    } catch (error) {
        console.error(`❌ [${sessionId}] Erreur sync messages:`, error);
        emitToSession(sessionId, 'sync_progress', {
            type: 'messages',
            status: 'error',
            message: 'Erreur synchronisation messages',
            error: String(error)
        });
    }

    // SIGNAL FINAL
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`✅ [${sessionId}] Synchronisation terminée en ${duration}s`);

    emitToSession(sessionId, 'whatsapp_event', {
        type: 'sync_complete',
        data: {
            user: sock.user,
            message: 'Synchronisation terminée',
            duration
        }
    });

    emitToSession(sessionId, 'whatsapp_event', {
        type: 'connected',
        data: {
            user: sock.user,
            message: 'WhatsApp connecté et données synchronisées'
        }
    });
}

// ============================================================================
// RESTAURATION
// ============================================================================

async function restorePersistedSessions(io: Server): Promise<void> {
    const registry = loadRegistry();
    const entries = Object.entries(registry);
    if (!entries.length) return;

    console.log(`🔁 Restauration de ${entries.length} session(s) persistée(s)...`);

    for (const [userId, sessionId] of entries) {
        const authFolder = path.join(process.cwd(), 'whatsapp_sessions', sessionId);
        const credsFile = path.join(authFolder, 'creds.json');

        if (!fs.existsSync(credsFile)) {
            unregisterSession(userId);
            continue;
        }

        const fakeSocket = {
            emit: (event: string, data: unknown) => { io.to(sessionId).emit(event, data); },
            join: (_room: string) => { }
        };

        sessions.set(sessionId, {
            socketId: '',
            realUserid: userId,
            socket: fakeSocket,
            authFolder,
            status: 'initializing',
            reconnectAttempts: 0,
            createdAt: new Date()
        });

        try {
            await initializeWhatsAppSession(fakeSocket, sessionId, 'qr', undefined, userId);
        } catch (error) {
            console.error(`❌ Échec restauration ${sessionId}:`, error);
            sessions.delete(sessionId);
        }
    }
}
