// server-ws.ts (à la racine du projet)
import { Server } from 'socket.io';
import { createServer } from 'http';
import {
    makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    WASocket,
    proto,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
 
// Import des services de synchronisation
import { syncContacts } from '@/services/syncDB/contactSyncService';
import { syncUserData } from '@/services/syncDB/userSyncService';
import { syncConversations } from '@/services/syncDB/conversationSyncService';
 
// ============================================================================
// TYPES & CONSTANTES
// ============================================================================
 
interface SessionData {
    socketId: string;
    realUserid: string;
    socket: any;
    sock?: WASocket;
    authFolder?: string;
    method?: 'qr' | 'phone';
    phone?: string;
    status: SessionStatus;
    reconnectAttempts: number;
    reconnectTimer?: ReturnType<typeof setTimeout>;
    lastConnectedAt?: Date;
    createdAt: Date;
}
 
type SessionStatus =
    | 'initializing'
    | 'qr_pending'
    | 'pairing_pending'
    | 'connected'
    | 'disconnected'
    | 'reconnecting'
    | 'logged_out';
 
const PORT = 3001;
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY_MS = 5_000;
const MAX_RECONNECT_DELAY_MS = 60_000;
 
// Fichier de persistance des meta-sessions (userId ↔ sessionId)
const SESSION_REGISTRY_PATH = path.join(process.cwd(), 'whatsapp_sessions', 'registry.json');
 
// ============================================================================
// SERVEUR HTTP + SOCKET.IO
// ============================================================================
 
const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    },
    // Ping / pong pour détecter les clients zombies
    pingTimeout: 20_000,
    pingInterval: 25_000,
});
 
console.log('🚀 Démarrage du serveur WebSocket...');
 
// Map principale des sessions actives (en mémoire)
const sessions = new Map<string, SessionData>();
 
// ============================================================================
// REGISTRY PERSISTANT (survit aux redémarrages du serveur)
// ============================================================================
 
function loadRegistry(): Record<string, string> {
    try {
        if (fs.existsSync(SESSION_REGISTRY_PATH)) {
            return JSON.parse(fs.readFileSync(SESSION_REGISTRY_PATH, 'utf8'));
        }
    } catch { /* fichier absent ou corrompu */ }
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
 
/** Retourne le sessionId lié à un userId, ou null si inconnu */
function getSessionIdForUser(userId: string): string | null {
    const registry = loadRegistry();
    return registry[userId] ?? null;
}
 
/** Lie un userId à un sessionId et persiste le lien */
function registerSession(userId: string, sessionId: string): void {
    const registry = loadRegistry();
    registry[userId] = sessionId;
    saveRegistry(registry);
}
 
/** Supprime l'entrée du registry pour un userId */
function unregisterSession(userId: string): void {
    const registry = loadRegistry();
    delete registry[userId];
    saveRegistry(registry);
}
 
// ============================================================================
// UTILITAIRES
// ============================================================================
 
/** Délai exponentiel plafonné */
function reconnectDelay(attempt: number): number {
    const delay = BASE_RECONNECT_DELAY_MS * Math.pow(2, attempt);
    return Math.min(delay, MAX_RECONNECT_DELAY_MS);
}
 
function setSessionStatus(sessionId: string, status: SessionStatus): void {
    const session = sessions.get(sessionId);
    if (session) {
        session.status = status;
        session.socket.emit('session_status', { sessionId, status });
    }
}
 
function emitToSession(sessionId: string, event: string, data: unknown): void {
    const session = sessions.get(sessionId);
    if (session?.socket) {
        session.socket.emit(event, data);
    }
}
 
// ============================================================================
// GESTION DES CONNEXIONS SOCKET.IO
// ============================================================================
 
io.on('connection', (socket) => {
    console.log(`🔌 Client connecté: ${socket.id}`);
 
    // ------------------------------------------------------------------
    // AUTHENTICATE
    // ------------------------------------------------------------------
    socket.on('authenticate', async (data: { sessionId: string; realUserid: string }) => {
        const { sessionId, realUserid } = data;
        console.log(`🔐 Authentification session: ${sessionId}, utilisateur: ${realUserid}`);
 
        // Si une session existante tourne déjà pour ce client, mettre à jour le socket
        const existing = sessions.get(sessionId);
        if (existing) {
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
        });
        socket.join(sessionId);
 
        socket.emit('authenticated', { success: true, sessionId, status: 'initializing' });
 
        // Si un dossier d'auth existe déjà pour cette session, restaurer automatiquement
        const authFolder = path.join(process.cwd(), 'whatsapp_sessions', sessionId);
        if (fs.existsSync(path.join(authFolder, 'creds.json'))) {
            console.log(`♻️  Auth existante détectée pour ${sessionId} – reconnexion automatique...`);
            await initializeWhatsAppSession(socket, sessionId, 'qr', undefined, realUserid);
        }
    });
 
    // ------------------------------------------------------------------
    // INIT_WHATSAPP
    // ------------------------------------------------------------------
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
            if (!realUserId) throw new Error('realUserid manquant');
 
            // Éviter une double-initialisation si déjà connecté
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
 
    // ------------------------------------------------------------------
    // LOGOUT_WHATSAPP  (nouveau)
    // ------------------------------------------------------------------
    socket.on('logout_whatsapp', async (data: { sessionId: string }) => {
        const { sessionId } = data;
        const session = sessions.get(sessionId);
        if (!session) {
            socket.emit('whatsapp_event', { type: 'error', data: { message: 'Session introuvable' } });
            return;
        }
 
        try {
            if (session.sock) await session.sock.logout();
        } catch { /* on continue la purge même si ça plante */ }
 
        cleanupSession(sessionId, true);
        socket.emit('whatsapp_event', { type: 'logged_out', data: { sessionId } });
    });
 
    // ------------------------------------------------------------------
    // GET_SESSION_STATUS  (nouveau)
    // ------------------------------------------------------------------
    socket.on('get_session_status', (data: { sessionId: string }) => {
        const session = sessions.get(data.sessionId);
        socket.emit('session_status', {
            sessionId: data.sessionId,
            status: session?.status ?? 'not_found',
            lastConnectedAt: session?.lastConnectedAt,
        });
    });
 
    // ------------------------------------------------------------------
    // DISCONNECT
    // ------------------------------------------------------------------
    socket.on('disconnect', (reason) => {
        console.log(`🔌 Client déconnecté: ${socket.id}, raison: ${reason}`);
 
        // On NE ferme PAS la connexion WhatsApp : on la garde pour la persistance.
        // On met juste à jour le socketId pour savoir que le client est parti.
        for (const [, session] of sessions.entries()) {
            if (session.socketId === socket.id) {
                session.socketId = '';
                // Le sock WhatsApp reste vivant.
            }
        }
    });
});
 
// ============================================================================
// NETTOYAGE D'UNE SESSION
// ============================================================================
 
function cleanupSession(sessionId: string, deleteAuthFiles = false): void {
    const session = sessions.get(sessionId);
    if (!session) return;
 
    // Annuler le timer de reconnexion si en cours
    if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
 
    // Fermer le socket WhatsApp
    if (session.sock) {
        try { session.sock.end(undefined); } catch { /* ignore */ }
    }
 
    // Supprimer les fichiers d'auth si demandé (logout)
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
// INITIALISATION D'UNE SESSION WHATSAPP
// ============================================================================
 
async function initializeWhatsAppSession(
    socket: any,
    sessionId: string,
    method: 'qr' | 'phone',
    phone?: string,
    realUserid?: string,
): Promise<WASocket | undefined> {
    const authFolder = path.join(process.cwd(), 'whatsapp_sessions', sessionId);
    fs.mkdirSync(authFolder, { recursive: true });
 
    const session = sessions.get(sessionId);
    if (session) {
        session.method = method;
        session.phone = phone;
        session.authFolder = authFolder;
        setSessionStatus(sessionId, 'initializing');
    }
 
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version } = await fetchLatestBaileysVersion();
 
    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        printQRInTerminal: false,
        logger: pino({ level: 'fatal' }),
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        connectTimeoutMs: 60_000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10_000,
        emitOwnEvents: true,
        syncFullHistory: false,
        markOnlineOnConnect: true,
        getMessage: async () => ({ conversation: '' }),
        retryRequestDelayMs: 250,
        maxMsgRetryCount: 5,
    });
 
    if (session) {
        // Remplacer l'ancien sock si reconnexion
        if (session.sock) {
            try { session.sock.end(undefined); } catch { /* ignore */ }
        }
        session.sock = sock;
    }
 
    // ------------------------------------------------------------------
    // CREDENTIALS
    // ------------------------------------------------------------------
    sock.ev.on('creds.update', async () => {
        try {
            await saveCreds();
        } catch (error) {
            console.error('Erreur sauvegarde credentials:', error);
        }
    });
 
    // ------------------------------------------------------------------
    // CONNECTION UPDATE
    // ------------------------------------------------------------------
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        console.log(`🔄 [${sessionId}] Connection update – status: ${connection ?? 'n/a'}, QR: ${!!qr}`);
 
        // ---- QR Code ----
        if (qr && method === 'qr') {
            setSessionStatus(sessionId, 'qr_pending');
            try {
                const qrImage = await QRCode.toDataURL(qr, {
                    errorCorrectionLevel: 'M',
                    type: 'image/png',
                    margin: 1,
                    width: 300,
                });
                emitToSession(sessionId, 'whatsapp_event', { type: 'qr', data: { qr: qrImage } });
            } catch (error) {
                emitToSession(sessionId, 'whatsapp_event', {
                    type: 'error',
                    data: { message: 'Erreur génération QR', error: (error as Error).message },
                });
            }
        }
 
        // ---- OPEN ----
        if (connection === 'open' && realUserid) {
            console.log(`✅ [${sessionId}] WhatsApp connecté`);
 
            const s = sessions.get(sessionId);
            if (s) {
                s.reconnectAttempts = 0;
                s.lastConnectedAt = new Date();
            }
            setSessionStatus(sessionId, 'connected');
 
            // Persister le lien userId ↔ sessionId
            registerSession(realUserid, sessionId);
 
            await runSyncSequence(socket, sessionId, sock, realUserid);
        }
 
        // ---- CLOSE ----
        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
            const reason = DisconnectReason[statusCode as keyof typeof DisconnectReason] ?? 'Unknown';
 
            console.log(`❌ [${sessionId}] WhatsApp déconnecté: ${reason} (${statusCode})`);
 
            if (statusCode === DisconnectReason.loggedOut) {
                // Déconnexion volontaire / compte révoqué
                setSessionStatus(sessionId, 'logged_out');
                emitToSession(sessionId, 'whatsapp_event', {
                    type: 'logged_out',
                    data: { reason, sessionId },
                });
                cleanupSession(sessionId, true);
                return;
            }
 
            // Toute autre erreur → on tente de reconnecter
            const s = sessions.get(sessionId);
            if (!s) return;
 
            if (s.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                const delay = reconnectDelay(s.reconnectAttempts);
                s.reconnectAttempts++;
                setSessionStatus(sessionId, 'reconnecting');
 
                console.log(
                    `♻️  [${sessionId}] Tentative ${s.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} dans ${delay / 1000}s...`,
                );
                emitToSession(sessionId, 'whatsapp_event', {
                    type: 'reconnecting',
                    data: { attempt: s.reconnectAttempts, maxAttempts: MAX_RECONNECT_ATTEMPTS, delayMs: delay },
                });
 
                s.reconnectTimer = setTimeout(async () => {
                    try {
                        await initializeWhatsAppSession(socket, sessionId, method, phone, realUserid);
                    } catch (error) {
                        console.error(`❌ [${sessionId}] Échec reconnexion:`, error);
                        emitToSession(sessionId, 'whatsapp_event', {
                            type: 'disconnected',
                            data: { reason: 'reconnection_failed', statusCode },
                        });
                    }
                }, delay);
            } else {
                // Épuisement des tentatives
                setSessionStatus(sessionId, 'disconnected');
                console.error(`❌ [${sessionId}] Max tentatives de reconnexion atteintes`);
                emitToSession(sessionId, 'whatsapp_event', {
                    type: 'disconnected',
                    data: { reason: 'max_reconnect_attempts_reached', statusCode },
                });
            }
        }
    });
 
    // ------------------------------------------------------------------
    // TEMPS RÉEL – Contacts
    // ------------------------------------------------------------------
    sock.ev.on('contacts.upsert', async (contacts) => {
        if (!realUserid) return;
        try {
            const result = await syncContacts(contacts as any, realUserid);
            console.log(`🔄 [${sessionId}] ${result.synced} contacts mis à jour`);
            emitToSession(sessionId, 'contacts_updated', {
                type: 'contacts_upsert',
                synced: result.synced,
                total: result.stats.total,
            });
        } catch (error) {
            console.error(`❌ [${sessionId}] Erreur sync contacts temps réel:`, error);
        }
    });
 
    // ------------------------------------------------------------------
    // TEMPS RÉEL – Conversations
    // ------------------------------------------------------------------
    sock.ev.on('chats.upsert', async (chats) => {
        if (!realUserid) return;
        try {
            const result = await syncConversations(chats as any, realUserid);
            console.log(`💬 [${sessionId}] ${(result as any).synced} conversations mises à jour`);
            emitToSession(sessionId, 'chats_updated', {
                type: 'chats_upsert',
                synced: (result as any).synced,
                total: (result as any).stats.total,
            });
        } catch (error) {
            console.error(`❌ [${sessionId}] Erreur sync conversations temps réel:`, error);
        }
    });
 
    // ------------------------------------------------------------------
    // TEMPS RÉEL – Messages entrants
    // ------------------------------------------------------------------
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        console.log(`📨 [${sessionId}] ${messages.length} message(s) – type: ${type}`);
        // Filtre : uniquement les messages réellement reçus (pas les notifications systèmes)
        const incoming = messages.filter(
            (m: proto.IWebMessageInfo) => !m.key?.fromMe && m.message,
        );
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
    });
 
    // ------------------------------------------------------------------
    // TEMPS RÉEL – Mise à jour de message (lu, supprimé…)
    // ------------------------------------------------------------------
    sock.ev.on('messages.update', (updates) => {
        emitToSession(sessionId, 'messages_status_updated', {
            type: 'messages_update',
            updates: updates.map((u) => ({
                id: u.key.id,
                remoteJid: u.key.remoteJid,
                status: u.update.status,
            })),
        });
    });
 
    // ------------------------------------------------------------------
    // PAIRING CODE (méthode phone)
    // ------------------------------------------------------------------
    const isAlreadyRegistered = state.creds.registered;
    if (method === 'phone' && phone && !isAlreadyRegistered) {
        setSessionStatus(sessionId, 'pairing_pending');
        setTimeout(async () => {
            try {
                const cleanPhone = phone.replace(/[^0-9]/g, '');
                console.log(`🔑 [${sessionId}] Demande pairing code pour: ${cleanPhone}`);
                const code = await sock.requestPairingCode(cleanPhone);
                console.log(`🔑 [${sessionId}] Code de jumelage: ${code}`);
                emitToSession(sessionId, 'whatsapp_event', {
                    type: 'pairing_code',
                    data: { code, phone: cleanPhone },
                });
            } catch (error) {
                emitToSession(sessionId, 'whatsapp_event', {
                    type: 'error',
                    data: { message: 'Erreur code jumelage', error: (error as Error).message },
                });
            }
        }, 3_000);
    }
 
    return sock;
}
 
// ============================================================================
// SYNCHRONISATION INITIALE (après connexion)
// ============================================================================
 
async function runSyncSequence(
    socket: any,
    sessionId: string,
    sock: WASocket,
    realUserid: string,
): Promise<void> {
    // 1. Utilisateur
    try {
        if (sock.user) {
            await syncUserData((sock as any).user, realUserid);
            emitToSession(sessionId, 'sync_progress', {
                type: 'user',
                status: 'completed',
                message: 'Profil utilisateur synchronisé',
            });
            console.log(`👤 [${sessionId}] Profil synchronisé`);
        }
    } catch (error) {
        console.error(`❌ [${sessionId}] Erreur sync utilisateur:`, error);
        emitToSession(sessionId, 'sync_progress', {
            type: 'user',
            status: 'error',
            message: 'Erreur synchronisation profil',
        });
    }
 
    // 2. Contacts
    try {
        const contacts = await (sock as any).fetchContacts();
        const contactResult = await syncContacts(contacts, realUserid);
        console.log(`📇 [${sessionId}] ${contactResult.synced} contacts synchronisés`);
        emitToSession(sessionId, 'sync_progress', {
            type: 'contacts',
            status: 'completed',
            synced: contactResult.synced,
            total: contactResult.stats.total,
            message: `${contactResult.synced} contacts synchronisés`,
        });
    } catch (error) {
        console.error(`❌ [${sessionId}] Erreur sync contacts:`, error);
        emitToSession(sessionId, 'sync_progress', {
            type: 'contacts',
            status: 'error',
            message: 'Erreur synchronisation contacts',
        });
    }
 
    // 3. Conversations
    try {
        const chats = await (sock as any).fetchChats();
        const conversationResult = await syncConversations(chats, realUserid);
        console.log(`💬 [${sessionId}] ${(conversationResult as any).synced} conversations synchronisées`);
        emitToSession(sessionId, 'sync_progress', {
            type: 'conversations',
            status: 'completed',
            synced: (conversationResult as any).synced,
            total: (conversationResult as any).stats.total,
            message: `${(conversationResult as any).synced} conversations synchronisées`,
        });
    } catch (error) {
        console.error(`❌ [${sessionId}] Erreur sync conversations:`, error);
        emitToSession(sessionId, 'sync_progress', {
            type: 'conversations',
            status: 'error',
            message: 'Erreur synchronisation conversations',
        });
    }
 
    // Signal final
    emitToSession(sessionId, 'whatsapp_event', {
        type: 'connected',
        data: {
            user: sock.user,
            message: 'WhatsApp connecté et données synchronisées',
        },
    });
    console.log(`✅ [${sessionId}] Synchronisation terminée`);
}
 
// ============================================================================
// RESTAURATION DES SESSIONS AU DÉMARRAGE DU SERVEUR
// ============================================================================
 
async function restorePersistedSessions(): Promise<void> {
    const registry = loadRegistry();
    const entries = Object.entries(registry); // [userId, sessionId][]
    if (!entries.length) return;
 
    console.log(`🔁 Restauration de ${entries.length} session(s) persistée(s)...`);
 
    for (const [userId, sessionId] of entries) {
        const authFolder = path.join(process.cwd(), 'whatsapp_sessions', sessionId);
        const credsFile = path.join(authFolder, 'creds.json');
 
        if (!fs.existsSync(credsFile)) {
            console.warn(`⚠️  Auth introuvable pour ${sessionId} – entrée supprimée du registry`);
            unregisterSession(userId);
            continue;
        }
 
        console.log(`♻️  Restauration session ${sessionId} pour userId ${userId}`);
 
        // Créer une session fantôme en mémoire (sans socket client actif)
        const fakeSocket = {
            emit: (event: string, data: unknown) => {
                // Diffuser à tous les sockets qui ont rejoint ce sessionId
                io.to(sessionId).emit(event, data);
            },
            join: (_room: string) => { /* no-op */ },
        };
 
        sessions.set(sessionId, {
            socketId: '',
            realUserid: userId,
            socket: fakeSocket,
            authFolder,
            status: 'initializing',
            reconnectAttempts: 0,
            createdAt: new Date(),
        });
 
        try {
            await initializeWhatsAppSession(fakeSocket, sessionId, 'qr', undefined, userId);
        } catch (error) {
            console.error(`❌ Échec restauration ${sessionId}:`, error);
            sessions.delete(sessionId);
        }
    }
}
 
// ============================================================================
// DÉMARRAGE DU SERVEUR
// ============================================================================
 
httpServer.listen(PORT, async () => {
    console.log(`✅ Serveur WebSocket démarré sur le port ${PORT}`);
    console.log(`📡 Prêt à recevoir des connexions de: ${process.env.FRONTEND_URL ?? 'http://localhost:3000'}`);
    console.log(`💾 Synchronisation DB activée (contacts, conversations, utilisateur)`);
 
    // Restaurer les sessions WhatsApp persistées
    await restorePersistedSessions();
});
 
// ============================================================================
// ARRÊT PROPRE
// ============================================================================
 
async function gracefulShutdown(signal: string): Promise<void> {
    console.log(`\n🛑 Signal ${signal} reçu – arrêt du serveur...`);
 
    for (const [sessionId, session] of sessions.entries()) {
        if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
        if (session.sock) {
            try {
                session.sock.end(undefined);
                console.log(`📱 Connexion WhatsApp fermée: ${sessionId}`);
            } catch { /* ignore */ }
        }
    }
 
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    console.log('✅ Serveur WebSocket arrêté proprement');
    process.exit(0);
}
 
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
 
process.on('uncaughtException', (error) => {
    console.error('❌ Exception non capturée:', error);
});
 
process.on('unhandledRejection', (reason) => {
    console.error('❌ Promesse rejetée non gérée:', reason);
});