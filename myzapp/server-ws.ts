// server-ws.ts (à la racine du projet)
import { Server } from 'socket.io';
import { createServer } from 'http';
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';

// Import des services de synchronisation
import { syncContacts } from '@/services/syncDB/contactSyncService';
import { syncUserData } from '@/services/syncDB/userSyncService';
import { syncConversations } from '@/services/syncDB/conversationSyncService';

const PORT = 3001;

// Créer le serveur HTTP (nécessaire pour Socket.IO)
const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:3000",
        credentials: true
    }
});

console.log('🚀 Démarrage du serveur WebSocket...');

// Stockage des sessions (en mémoire pour le développement)
const sessions = new Map();

io.on('connection', (socket) => {
    console.log(`🔌 Client connecté: ${socket.id}`);

    // Authentification
    socket.on('authenticate', async (data) => {
        const { sessionId, userId } = data;
        console.log(`🔐 Authentification session: ${sessionId}, utilisateur: ${userId}`);

        // Stocker la session
        sessions.set(sessionId, { 
            socketId: socket.id, 
            userId,
            socket: socket
        });
        socket.join(sessionId);

        socket.emit('authenticated', { success: true, sessionId });
    });

    // Initialiser WhatsApp
    socket.on('init_whatsapp', async (data) => {
        const { sessionId, method, phone, userId } = data;
        console.log(`📱 Initialisation WhatsApp: ${method} pour ${sessionId}, utilisateur: ${userId}`);

        try {
            await initializeWhatsAppSession(socket, sessionId, method, phone, userId);
        } catch (error) {
            console.error('❌ Erreur initialisation WhatsApp:', error);
            socket.emit('whatsapp_event', {
                type: 'error',
                data: { message: 'Erreur initialisation WhatsApp', error: (error as Error).message }
            });
        }
    });

    // Déconnexion
    socket.on('disconnect', (reason) => {
        console.log(`🔌 Client déconnecté: ${socket.id}, raison: ${reason}`);
        
        // Nettoyer les sessions associées à ce socket
        for (const [sessionId, session] of sessions.entries()) {
            if (session.socketId === socket.id) {
                // Fermer proprement la connexion WhatsApp si elle existe
                if (session.sock) {
                    try {
                        session.sock.end(undefined);
                        console.log(`📱 Connexion WhatsApp fermée pour: ${sessionId}`);
                    } catch (error) {
                        console.error('Erreur fermeture socket WhatsApp:', error);
                    }
                }
                
                sessions.delete(sessionId);
                console.log(`🗑️ Session nettoyée: ${sessionId}`);
            }
        }
    });
});

// Fonction d'initialisation WhatsApp
async function initializeWhatsAppSession(socket: any, sessionId: string, method: 'qr' | 'phone', phone?: string, userId?: string) {
    const authFolder = path.join(process.cwd(), 'whatsapp_sessions', sessionId);

    // Créer le dossier de session
    if (!fs.existsSync(authFolder)) {
        fs.mkdirSync(authFolder, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        printQRInTerminal: false,
        logger: pino({ level: 'fatal' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"], // ← Configuration qui fonctionne
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

    // Stocker le socket WhatsApp dans la session
    const session = sessions.get(sessionId);
    if (session) {
        session.sock = sock;
        session.authFolder = authFolder;
    }

    // Gestion des credentials
    sock.ev.on('creds.update', async () => {
        try {
            await saveCreds();
            socket.emit('whatsapp_event', {
                type: 'status',
                data: { event: 'credentials_saved' }
            });
        } catch (error) {
            console.error('Erreur sauvegarde credentials:', error);
        }
    });

    // ============================================================================
    // GESTION PRINCIPALE DE LA CONNEXION ET SYNCHRONISATION
    // ============================================================================

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        console.log(`🔄 Connection update - Status: ${connection}, QR: ${!!qr}`);

        // Gestion du QR Code
        if (qr && method === 'qr') {
            try {
                const qrImage = await QRCode.toDataURL(qr, {
                    errorCorrectionLevel: 'M',
                    type: 'image/png',
                    margin: 1,
                    width: 300
                });

                socket.emit('whatsapp_event', {
                    type: 'qr',
                    data: { qr: qrImage }
                });
            } catch (error) {
                socket.emit('whatsapp_event', {
                    type: 'error',
                    data: { message: 'Erreur génération QR', error: (error as Error).message }
                });
            }
        }

        // CONNEXION ÉTABLIE - SYNCHRONISATION DES DONNÉES
        if (connection === 'open' && userId) {
            console.log('✅ WhatsApp connecté - Début synchronisation des données...');

            try {
                // 1. Synchroniser les données utilisateur WhatsApp
                if (sock.user) {
                    await syncUserData(sock.user, userId);
                    console.log('👤 Données utilisateur synchronisées');
                    
                    socket.emit('sync_progress', {
                        type: 'user',
                        status: 'completed',
                        message: 'Profil utilisateur synchronisé'
                    });
                }

                // 2. Synchroniser les contacts
                try {
                    const contacts = await (sock as any).fetchContacts();
                    const contactResult = await syncContacts(contacts, userId);
                    console.log(`📇 ${contactResult.synced} contacts synchronisés`);
                    
                    socket.emit('sync_progress', {
                        type: 'contacts',
                        status: 'completed',
                        synced: contactResult.synced,
                        total: contactResult.stats.total,
                        message: `${contactResult.synced} contacts synchronisés`
                    });
                } catch (contactError) {
                    console.error('❌ Erreur synchronisation contacts:', contactError);
                    socket.emit('sync_progress', {
                        type: 'contacts',
                        status: 'error',
                        message: 'Erreur synchronisation contacts'
                    });
                }

                // 3. Synchroniser les conversations
                try {
                    const chats = await (sock as any).fetchChats();
                    const conversationResult = await syncConversations(chats, userId);
                    console.log(`💬 ${(conversationResult as any).synced} conversations synchronisées`);
                    
                    socket.emit('sync_progress', {
                        type: 'conversations',
                        status: 'completed', 
                        synced: (conversationResult as any).synced,
                        total: (conversationResult as any).stats.total,
                        message: `${(conversationResult as any).synced} conversations synchronisées`
                    });
                } catch (conversationError) {
                    console.error('❌ Erreur synchronisation conversations:', conversationError);
                    socket.emit('sync_progress', {
                        type: 'conversations',
                        status: 'error',
                        message: 'Erreur synchronisation conversations'
                    });
                }

                console.log('✅ Synchronisation terminée avec succès');
                
                // Émettre l'événement de connexion réussie
                socket.emit('whatsapp_event', {
                    type: 'connected',
                    data: {
                        user: sock.user,
                        message: 'WhatsApp connecté et données synchronisées'
                    }
                });

            } catch (syncError) {
                console.error('❌ Erreur lors de la synchronisation:', syncError);
                socket.emit('whatsapp_event', {
                    type: 'error',
                    data: { message: 'Erreur synchronisation données', error: (syncError as Error).message }
                });
            }
        }

        // Gestion de la déconnexion
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error instanceof Boom
                && (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;

            const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
            const reason = DisconnectReason[statusCode] || 'Unknown';

            console.log(`❌ WhatsApp déconnecté: ${reason} (${statusCode})`);

            // GESTION SPÉCIFIQUE POUR restartRequired
            if (statusCode === DisconnectReason.restartRequired) {
                console.log('♻️  Redémarrage nécessaire - tentative automatique...');

                // Attendre et réessayer
                setTimeout(async () => {
                    try {
                        console.log('🔄 Tentative de reconnexion...');
                        await initializeWhatsAppSession(socket, sessionId, method, phone, userId);
                    } catch (error) {
                        console.error('❌ Échec reconnexion:', error);
                        socket.emit('whatsapp_event', {
                            type: 'disconnected',
                            data: { reason: 'reconnection_failed', statusCode }
                        });
                    }
                }, 5000);

                return;
            }

            // Pour les autres erreurs
            socket.emit('whatsapp_event', {
                type: 'disconnected',
                data: { reason, statusCode, shouldReconnect }
            });

            // Nettoyer seulement sur loggedOut
            if (statusCode === DisconnectReason.loggedOut) {
                try {
                    if (fs.existsSync(authFolder)) {
                        fs.rmSync(authFolder, { recursive: true, force: true });
                        console.log(`🧹 Dossier session nettoyé: ${authFolder}`);
                    }
                } catch (error) {
                    console.error('Erreur nettoyage dossier:', error);
                }
            }
        }
    });

    // ============================================================================
    // SYNCHRONISATION EN TEMPS RÉEL
    // ============================================================================

    // Nouveaux contacts
    sock.ev.on('contacts.upsert', async (contacts) => {
        if (userId) {
            try {
                const result = await syncContacts((contacts as any), userId);
                console.log(`🔄 ${result.synced} nouveaux contacts synchronisés en temps réel`);
                
                socket.emit('contacts_updated', {
                    type: 'contacts_upsert',
                    synced: result.synced,
                    total: result.stats.total
                });
            } catch (error) {
                console.error('❌ Erreur synchronisation temps réel contacts:', error);
            }
        }
    });

    // Nouvelles conversations
    sock.ev.on('chats.upsert', async (chats) => {
        if (userId) {
            try {
                const result = await syncConversations(chats, userId);
                console.log(`💬 ${(result as any).synced} nouvelles conversations synchronisées`);
                
                socket.emit('chats_updated', {
                    type: 'chats_upsert',
                    synced: (result as any).synced,
                    total: (result as any).stats.total
                });
            } catch (error) {
                console.error('❌ Erreur synchronisation temps réel conversations:', error);
            }
        }
    });

    // Nouveaux messages
    sock.ev.on('messages.upsert', async ({ messages }) => {
        console.log(`📨 ${messages.length} nouveau(x) message(s) reçu(s)`);
        // Ici tu pourras ajouter la synchronisation des messages plus tard
        socket.emit('messages_updated', {
            type: 'messages_upsert',
            count: messages.length
        });
    });

    // Gestion du code de jumelage
    if (method === 'phone' && phone && !sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                const cleanPhone = phone.replace(/[^0-9]/g, "");
                const code = await sock.requestPairingCode(cleanPhone);

                socket.emit('whatsapp_event', {
                    type: 'pairing_code',
                    data: { code, phone: cleanPhone }
                });
            } catch (error) {
                socket.emit('whatsapp_event', {
                    type: 'error',
                    data: { message: 'Erreur code jumelage', error: (error as Error).message }
                });
            }
        }, 3000);
    }

    return sock;
}

// Démarrer le serveur
httpServer.listen(PORT, () => {
    console.log(`✅ Serveur WebSocket démarré sur le port ${PORT}`);
    console.log(`📡 Prêt à recevoir des connexions de: http://localhost:3000`);
    console.log(`💾 Synchronisation DB activée pour les contacts, conversations et utilisateur`);
});

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt du serveur WebSocket...');
    
    // Fermer toutes les connexions WhatsApp actives
    for (const [sessionId, session] of sessions.entries()) {
        if (session.sock) {
            try {
                session.sock.end(undefined);
                console.log(`📱 Connexion WhatsApp fermée pour: ${sessionId}`);
            } catch (error) {
                console.error('Erreur fermeture socket:', error);
            }
        }
    }
    
    httpServer.close(() => {
        console.log('✅ Serveur WebSocket arrêté proprement');
        process.exit(0);
    });
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
    console.error('❌ Erreur non capturée:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesse rejetée non gérée:', reason);
});
