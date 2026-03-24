// src/lib/websocket-server.ts
import { Server } from 'socket.io';
import { createServer } from 'http';
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

interface WhatsAppSession {
    socketId: string;
    userId?: string;
    sock: ReturnType<typeof makeWASocket> | null;
    authFolder: string;
    status: 'initializing' | 'qr_sent' | 'connected' | 'disconnected' | 'error';
    createdAt: Date;
    lastActivity: Date;
    metadata?: {
        device?: string;
        browser?: string;
        ip?: string;
    };
}

interface SocketEvent {
    type: 'qr' | 'connected' | 'disconnected' | 'error' | 'message' | 'status' | 'pairing_code';
    data: any;
    sessionId: string;
    timestamp: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_SESSIONS_PER_USER = 3;

// ============================================================================
// SESSION MANAGER
// ============================================================================

class SessionManager {
    private sessions: Map<string, WhatsAppSession> = new Map();
    private userSessions: Map<string, string[]> = new Map(); // userId → sessionIds

    constructor() {
        // Nettoyage périodique des sessions expirées
        setInterval(() => this.cleanupExpiredSessions(), CLEANUP_INTERVAL);
    }

    createSession(socketId: string, userId?: string, metadata?: any): string {
        const sessionId = crypto.randomBytes(16).toString('hex');

        // Vérifier la limite de sessions par utilisateur
        if (userId) {
            const userSessions = this.userSessions.get(userId) || [];
            if (userSessions.length >= MAX_SESSIONS_PER_USER) {
                // Supprimer la plus ancienne session
                const oldestSessionId = userSessions.shift();
                if (oldestSessionId) {
                    this.destroySession(oldestSessionId);
                }
            }
        }

        const authFolder = path.join(process.cwd(), 'whatsapp_sessions', sessionId);

        const session: WhatsAppSession = {
            socketId,
            userId,
            sock: null,
            authFolder,
            status: 'initializing',
            createdAt: new Date(),
            lastActivity: new Date(),
            metadata
        };

        this.sessions.set(sessionId, session);

        if (userId) {
            const userSessions = this.userSessions.get(userId) || [];
            userSessions.push(sessionId);
            this.userSessions.set(userId, userSessions);
        }

        // Créer le dossier de session
        if (!fs.existsSync(authFolder)) {
            fs.mkdirSync(authFolder, { recursive: true });
        }

        return sessionId;
    }

    getSession(sessionId: string): WhatsAppSession | undefined {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastActivity = new Date();
        }
        return session;
    }

    updateSession(sessionId: string, updates: Partial<WhatsAppSession>): boolean {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        Object.assign(session, updates);
        session.lastActivity = new Date();
        return true;
    }

    destroySession(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        // Nettoyer le socket WhatsApp
        if (session.sock) {
            try {
                session.sock.end(undefined);
            } catch (error) {
                console.error(`Error closing WhatsApp socket for session ${sessionId}:`, error);
            }
        }

        // Nettoyer le dossier d'authentification
        try {
            if (fs.existsSync(session.authFolder)) {
                fs.rmSync(session.authFolder, { recursive: true, force: true });
            }
        } catch (error) {
            console.error(`Error cleaning auth folder for session ${sessionId}:`, error);
        }

        // Retirer des listes utilisateur
        if (session.userId) {
            const userSessions = this.userSessions.get(session.userId) || [];
            const index = userSessions.indexOf(sessionId);
            if (index > -1) {
                userSessions.splice(index, 1);
                if (userSessions.length === 0) {
                    this.userSessions.delete(session.userId);
                } else {
                    this.userSessions.set(session.userId, userSessions);
                }
            }
        }

        this.sessions.delete(sessionId);
        console.log(`Session ${sessionId} destroyed`);
    }

    getUserSessions(userId: string): WhatsAppSession[] {
        const sessionIds = this.userSessions.get(userId) || [];
        return sessionIds
            .map(id => this.sessions.get(id))
            .filter((session): session is WhatsAppSession => session !== undefined);
    }

    private cleanupExpiredSessions(): void {
        const now = Date.now();
        for (const [sessionId, session] of this.sessions.entries()) {
            const age = now - session.lastActivity.getTime();
            if (age > SESSION_TIMEOUT) {
                console.log(`Cleaning up expired session ${sessionId}`);
                this.destroySession(sessionId);
            }
        }
    }
}

// ============================================================================
// WHATSAPP MANAGER
// ============================================================================

class WhatsAppManager {
    private sessionManager: SessionManager;
    private io: Server;

    constructor(io: Server) {
        this.io = io;
        this.sessionManager = new SessionManager();
    }

    getSessionManager(): SessionManager {
        return this.sessionManager;
    }

    async initializeSession(sessionId: string, method: 'qr' | 'phone', phone?: string) {
        const session = this.sessionManager.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        try {
            const { state, saveCreds } = await useMultiFileAuthState(session.authFolder);
            const { version } = await fetchLatestBaileysVersion();

            const sock = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
                },
                printQRInTerminal: false,
                logger: pino({ level: 'fatal' }),
                browser: ["MyZapp", "Chrome", "110.0.0"],
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 0,
                keepAliveIntervalMs: 10000,
                emitOwnEvents: true,
                syncFullHistory: false,
                markOnlineOnConnect: true,
                getMessage: async () => ({ conversation: '' }),
                retryRequestDelayMs: 250,
                maxMsgRetryCount: 5,
            });

            // Mettre à jour la session
            this.sessionManager.updateSession(sessionId, { sock, status: 'initializing' });

            // Gestion des credentials
            sock.ev.on('creds.update', async () => {
                try {
                    await saveCreds();
                    this.emitToSession(sessionId, {
                        type: 'status',
                        data: { event: 'credentials_saved' }
                    });
                } catch (error) {
                    console.error(`Error saving credentials for session ${sessionId}:`, error);
                }
            });

            // Gestion de la connexion
            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr && method === 'qr') {
                    try {
                        const qrImage = await QRCode.toDataURL(qr, {
                            errorCorrectionLevel: 'M',
                            type: 'image/png',
                            margin: 1,
                            width: 300
                        });

                        this.emitToSession(sessionId, {
                            type: 'qr',
                            data: { qr: qrImage }
                        });

                        this.sessionManager.updateSession(sessionId, { status: 'qr_sent' });
                    } catch (error) {
                        this.emitError(sessionId, 'Failed to generate QR code', error);
                    }
                }

                if (connection === 'open') {
                    this.sessionManager.updateSession(sessionId, { status: 'connected' });

                    this.emitToSession(sessionId, {
                        type: 'connected',
                        data: {
                            user: sock.user,
                            message: 'WhatsApp connected successfully'
                        }
                    });
                }

                if (connection === 'close') {
                    const shouldReconnect = lastDisconnect?.error instanceof Boom
                        && (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;

                    const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
                    const reason = DisconnectReason[statusCode] || 'Unknown';

                    this.sessionManager.updateSession(sessionId, { status: 'disconnected' });

                    this.emitToSession(sessionId, {
                        type: 'disconnected',
                        data: { reason, statusCode, shouldReconnect }
                    });

                    if (!shouldReconnect) {
                        this.sessionManager.destroySession(sessionId);
                    }
                }
            });

            // Gestion des messages (optionnel)
            sock.ev.on('messages.upsert', ({ messages }) => {
                this.emitToSession(sessionId, {
                    type: 'message',
                    data: { count: messages.length, messages }
                });
            });

            // Gestion du code de jumelage
            if (method === 'phone' && phone && !sock.authState.creds.registered) {
                setTimeout(async () => {
                    try {
                        const cleanPhone = phone.replace(/[^0-9]/g, "");
                        const code = await sock.requestPairingCode(cleanPhone);

                        this.emitToSession(sessionId, {
                            type: 'pairing_code',
                            data: { code, phone: cleanPhone }
                        });
                    } catch (error) {
                        this.emitError(sessionId, 'Failed to generate pairing code', error);
                    }
                }, 3000);
            }

        } catch (error) {
            this.emitError(sessionId, 'Failed to initialize WhatsApp', error);
            this.sessionManager.destroySession(sessionId);
        }
    }

    private emitToSession(sessionId: string, event: Omit<SocketEvent, 'sessionId' | 'timestamp'>) {
        const session = this.sessionManager.getSession(sessionId);
        if (!session) return;

        const fullEvent: SocketEvent = {
            ...event,
            sessionId,
            timestamp: Date.now()
        };

        this.io.to(session.socketId).emit('whatsapp_event', fullEvent);
    }

    private emitError(sessionId: string, message: string, error?: any) {
        this.emitToSession(sessionId, {
            type: 'error',
            data: {
                message,
                error: error?.message || error?.toString() || 'Unknown error'
            }
        });
    }

    getSessionStatus(sessionId: string) {
        const session = this.sessionManager.getSession(sessionId);
        if (!session) {
            return { exists: false };
        }

        return {
            exists: true,
            status: session.status,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
            metadata: session.metadata
        };
    }

    disconnectSession(sessionId: string) {
        this.sessionManager.destroySession(sessionId);
    }

    getUserSessions(userId: string) {
        return this.sessionManager.getUserSessions(userId);
    }
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function authenticateSocket(socket: any): Promise<{ isAuthenticated: boolean; userId?: string }> {
    // TODO: Implement your authentication logic here
    // Example: verify token from socket handshake
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
    
    if (!token) {
        return { isAuthenticated: false };
    }

    try {
        // TODO: Validate token and extract userId
        // This is a placeholder implementation
        return { isAuthenticated: true, userId: 'user_' + Date.now() };
    } catch (error) {
        console.error('Authentication error:', error);
        return { isAuthenticated: false };
    }
}

// ============================================================================
// SOCKET.IO SERVER
// ============================================================================

let whatsappManager: WhatsAppManager;

export function initializeWebSocketServer(server: ReturnType<typeof createServer>) {
    const io = new Server(server, {
        cors: {
            origin: process.env.NODE_ENV === 'production'
                ? process.env.FRONTEND_URL
                : 'http://localhost:3000',
            credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000
    });

    whatsappManager = new WhatsAppManager(io);

    io.on('connection', async (socket) => {
        console.log(`Client connected: ${socket.id}`);

        // Authentification (optionnel)
        const auth = await authenticateSocket(socket);

        if (!auth.isAuthenticated) {
            console.warn(`Unauthenticated connection attempt: ${socket.id}`);
            socket.emit('auth_error', { message: 'Authentication required' });
            socket.disconnect();
            return;
        }

        // Créer une nouvelle session
        const sessionId = socket.handshake.query.sessionId as string;

        if (!sessionId) {
            socket.emit('error', { message: 'sessionId required' });
            socket.disconnect();
            return;
        }

        // Initialiser WhatsApp
        const whatsappSessionId = whatsappManager.getSessionManager().createSession(
            socket.id,
            auth.userId,
            {
                device: socket.handshake.headers['user-agent'],
                ip: socket.handshake.address,
                sessionId
            }
        );

        // Associer le socket à la session
        socket.join(whatsappSessionId);

        socket.emit('authenticated', {
            sessionId: whatsappSessionId,
            userId: auth.userId
        });

        // Vérifier le statut
        socket.on('get_status', (data: { sessionId: string }) => {
            const status = whatsappManager.getSessionStatus(data.sessionId);
            socket.emit('status_response', { sessionId: data.sessionId, status });
        });

        // Déconnecter
        socket.on('disconnect_session', (data: { sessionId: string }) => {
            whatsappManager.disconnectSession(data.sessionId);
            socket.emit('session_disconnected', { sessionId: data.sessionId });
        });

        // Déconnexion du client
        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
            // Nettoyer toutes les sessions associées à ce socket
            // (implémentation optionnelle)
        });
    });

    return io;
}

export function getWhatsAppManager() {
    if (!whatsappManager) {
        throw new Error('WebSocket server not initialized');
    }
    return whatsappManager;
}
