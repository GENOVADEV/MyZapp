const { WhatsAppBot } = require("./bot");
const { logger, SESSION } = require('../config');
const { sequelize, BotVariable, WhatsappSession } = require("./database");
const { CustomAuthState } = require("./auth");
const { flushQueueOnShutdown, stopFlushTimer } = require("./store");

class BotManager {
    constructor() {
        this.bots = new Map(); // Key: sessionId (string) -> WhatsAppBot instance
        this.broadcastStates = new Map(); // Key: sessionId -> Broadcast state object
        this.sessionStatuses = new Map(); // Key: sessionId -> { status, message, error, userJid, updatedAt }
    }

    normalizeSessionId(session) {
        if (!session) return "";
        let s = String(session).trim();
        if (s.startsWith("RGNK~")) {
            return s.split("~")[1] || s;
        }
        return s;
    }

    attachConnectionListeners(sessionId, bot) {
        const normId = this.normalizeSessionId(sessionId);
        if (!bot || !bot.sock || !bot.sock.ev) return;

        try {
            bot.sock.ev.on('connection.update', (update) => {
                const { connection, lastDisconnect, qr } = update;
                
                if (connection === 'open') {
                    const userJid = bot.sock.user?.id ? bot.sock.user.id.split(':')[0] + '@s.whatsapp.net' : null;
                    logger.info({ session: sessionId, userJid }, "🟢 [WhatsApp] Connexion ouverte et authentifiée !");
                    this.sessionStatuses.set(normId, {
                        status: 'connected',
                        connected: true,
                        message: 'Connecté avec succès à WhatsApp',
                        userJid: userJid,
                        user: bot.sock.user,
                        updatedAt: new Date().toISOString()
                    });
                    this.sessionStatuses.set(sessionId, this.sessionStatuses.get(normId));
                } else if (connection === 'connecting') {
                    logger.info({ session: sessionId }, "🟡 [WhatsApp] Négociation de la connexion...");
                    this.sessionStatuses.set(normId, {
                        status: 'connecting',
                        connected: false,
                        message: 'Authentification WhatsApp en cours...',
                        updatedAt: new Date().toISOString()
                    });
                    this.sessionStatuses.set(sessionId, this.sessionStatuses.get(normId));
                } else if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    const errorMsg = lastDisconnect?.error?.message || "Connexion fermée";
                    logger.warn({ session: sessionId, statusCode, errorMsg }, "🔴 [WhatsApp] Connexion fermée.");
                    
                    const isLoggedOut = statusCode === 401 || statusCode === 403;
                    this.sessionStatuses.set(normId, {
                        status: isLoggedOut ? 'error' : 'disconnected',
                        connected: false,
                        statusCode,
                        error: errorMsg,
                        message: isLoggedOut ? 'Session WhatsApp expirée ou déconnectée du téléphone' : 'Bot déconnecté',
                        updatedAt: new Date().toISOString()
                    });
                    this.sessionStatuses.set(sessionId, this.sessionStatuses.get(normId));
                }
            });
        } catch (err) {
            logger.warn({ session: sessionId, err }, "Could not attach connection listener");
        }
    }

    async initializeBots() {
        let dbSessions = [];
        try {
            const [botVar] = await BotVariable.findOrCreate({
                where: { key: 'SESSION' },
                defaults: { value: '' }
            });
            if (botVar.value) {
                dbSessions = botVar.value.split(',').map(s => s.trim()).filter(Boolean);
            }
        } catch (dbErr) {
            logger.error({ err: dbErr }, "Failed to read SESSION from BotVariable during initializeBots");
        }

        const allSessions = [...new Set([...SESSION, ...dbSessions])];

        logger.info({ sessions: allSessions }, `Initializing all configured bots.`);
        await CustomAuthState.deleteGarbageSessions(allSessions);        
        
        for (const sessionId of allSessions) {
            try {
                const normId = this.normalizeSessionId(sessionId);
                logger.info({ session: sessionId, normId }, `Attempting to initialize bot for session.`);
                this.sessionStatuses.set(normId, { status: 'connecting', connected: false, message: 'Démarrage du bot...' });
                
                const bot = new WhatsAppBot(sessionId);
                await bot.initialize(); 
                if (bot.sock) { 
                    this.bots.set(sessionId, bot);
                    if (normId !== sessionId) {
                        this.bots.set(normId, bot);
                    }
                    this.attachConnectionListeners(sessionId, bot);
                    logger.info({ session: sessionId }, `Bot initialization scheduled. Connection status will follow.`);
                } else {
                    logger.error({ session: sessionId }, `Bot object for session could not be initialized (sock is null).`);
                    this.sessionStatuses.set(normId, { status: 'error', connected: false, error: 'Impossible d\'initialiser le socket' });
                    await this.removeSessionFromDB(sessionId);
                }
            } catch (error) {
                logger.error({ session: sessionId, err: error }, `Overall failure to initialize bot in BotManager`);
                this.sessionStatuses.set(this.normalizeSessionId(sessionId), { status: 'error', connected: false, error: error.message });
                await this.removeSessionFromDB(sessionId);
            }
        }
    }

    async removeSessionFromDB(sessionId) {
        try {
            const botVar = await BotVariable.findOne({ where: { key: 'SESSION' } });
            if (botVar && botVar.value) {
                let sessionsArray = botVar.value.split(',').map(s => s.trim()).filter(Boolean);
                const normId = this.normalizeSessionId(sessionId);
                sessionsArray = sessionsArray.filter(s => s !== sessionId && this.normalizeSessionId(s) !== normId);
                botVar.value = sessionsArray.join(',');
                await botVar.save();
                logger.info({ session: sessionId }, `Session deleted from BotVariable database.`);
            }
        } catch (err) {
            logger.error({ session: sessionId, err }, "Failed to remove faulty session from DB");
        }
    }

    async startSession(sessionId) {
        const normId = this.normalizeSessionId(sessionId);
        const existingBot = this.getBot(sessionId);
        
        if (existingBot && existingBot.sock) {
            const isUserReady = !!(existingBot.sock.user?.id);
            return {
                success: true,
                message: isUserReady ? 'La session est déjà connectée et active.' : 'La session est en cours de connexion...',
                status: isUserReady ? 'connected' : 'connecting'
            };
        }

        try {
            logger.info({ session: sessionId }, `Attempting to initialize bot dynamically.`);
            this.sessionStatuses.set(normId, { status: 'connecting', connected: false, message: 'Démarrage et connexion à WhatsApp...' });
            
            const bot = new WhatsAppBot(sessionId);
            await bot.initialize(); 
            if (bot.sock) { 
                this.bots.set(sessionId, bot);
                if (normId !== sessionId) {
                    this.bots.set(normId, bot);
                }
                this.attachConnectionListeners(sessionId, bot);
                logger.info({ session: sessionId }, `Bot initialized dynamically.`);
                return {
                    success: true,
                    message: 'La session a été initialisée. Connexion à WhatsApp en cours...',
                    status: 'connecting'
                };
            } else {
                logger.error({ session: sessionId }, `Bot object for session could not be initialized (sock is null).`);
                this.sessionStatuses.set(normId, { status: 'error', connected: false, error: 'Socket non créé' });
                return { success: false, message: "Impossible d'initialiser le bot (sock is null)." };
            }
        } catch (error) {
            logger.error({ session: sessionId, err: error }, `Overall failure to initialize bot dynamically`);
            this.sessionStatuses.set(normId, { status: 'error', connected: false, error: error.message });
            return { success: false, error: error.message };
        }
    }

    getBot(sessionId) {
        if (!sessionId) return null;
        const normId = this.normalizeSessionId(sessionId);
        return this.bots.get(sessionId) || this.bots.get(normId) || null;
    }

    getStatus(sessionId) {
        if (!sessionId) {
            return { status: 'disconnected', connected: false, message: 'Aucune session fournie' };
        }
        const normId = this.normalizeSessionId(sessionId);
        const recorded = this.sessionStatuses.get(normId) || this.sessionStatuses.get(sessionId);
        const bot = this.getBot(sessionId);

        const isSockActive = !!(bot && bot.sock);
        const isUserReady = !!(bot && bot.sock && bot.sock.user && bot.sock.user.id);

        if (isUserReady) {
            const selfJid = bot.sock.user.id.split(':')[0] + '@s.whatsapp.net';
            return {
                status: 'connected',
                connected: true,
                message: 'En Ligne',
                jid: selfJid,
                user: bot.sock.user
            };
        }

        if (isSockActive) {
            return {
                status: 'connecting',
                connected: false,
                message: recorded?.message || 'Authentification WhatsApp en cours...',
                jid: null,
                error: recorded?.error || null
            };
        }

        return {
            status: recorded?.status || 'disconnected',
            connected: false,
            message: recorded?.message || 'Bot Déconnecté',
            jid: null,
            error: recorded?.error || null
        };
    }

    getSelfJid(sessionId) {
        const bot = this.getBot(sessionId);
        if (!bot || !bot.sock || !bot.sock.user) return null;
        const userJid = bot.sock.user.id;
        if (!userJid) return null;
        return userJid.split(':')[0] + '@s.whatsapp.net';
    }

    async stopAllTasks(sessionId) {
        const normId = this.normalizeSessionId(sessionId);
        const bot = this.getBot(sessionId);

        // 1. Arrêter la diffusion en cours pour cette session
        const state = this.broadcastStates.get(normId) || this.broadcastStates.get(sessionId);
        if (state) {
            state.status = 'stopped';
            state.queue = [];
            state.isPaused = false;
        }

        // 2. Annuler les timers et tâches du bot
        if (bot) {
            if (bot.diffuseQueueRunning) {
                bot.diffuseQueueRunning = false;
            }
            if (bot.activeBroadcastQueue) {
                bot.activeBroadcastQueue = [];
            }
        }

        logger.info({ sessionId }, "⛔ [Kill-Switch] Toutes les tâches et files d'attente ont été stoppées pour cette session.");
        return { success: true, message: "Toutes les actions en cours ont été arrêtées avec succès." };
    }

    async disconnectSession(sessionId) {
        const normId = this.normalizeSessionId(sessionId);
        logger.info({ sessionId }, "🔌 Déconnexion demandée depuis le Dashboard.");

        // Stoppe les tâches
        await this.stopAllTasks(sessionId);

        const bot = this.getBot(sessionId);
        if (bot) {
            try {
                if (bot.sock) {
                    await bot.sock.logout().catch(() => {});
                    bot.sock.end?.();
                }
            } catch (err) {
                logger.warn({ err }, "Error during socket logout/end");
            }
        }

        this.bots.delete(sessionId);
        this.bots.delete(normId);
        this.broadcastStates.delete(sessionId);
        this.broadcastStates.delete(normId);
        this.sessionStatuses.set(normId, { status: 'disconnected', connected: false, message: 'Déconnecté' });

        // Supprime de la base de données
        await this.removeSessionFromDB(sessionId);

        return { success: true, message: "Bot déconnecté avec succès." };
    }

    async getGroups(sessionId) {
        const bot = this.getBot(sessionId);
        if (!bot || !bot.sock) {
            throw new Error("Bot déconnecté ou introuvable pour cette session.");
        }
        try {
            const participating = await bot.sock.groupFetchAllParticipating();
            const groups = Object.values(participating).map(g => ({
                id: g.id,
                subject: g.subject || "Groupe sans titre",
                creation: g.creation,
                owner: g.owner,
                size: g.participants?.length || 0,
                desc: g.desc ? g.desc.toString() : ""
            }));
            return groups;
        } catch (err) {
            logger.error({ sessionId, err }, "Failed to fetch groups");
            throw err;
        }
    }

    async sendMessage(sessionId, jid, message) {
        const bot = this.getBot(sessionId);
        if (!bot) {
            throw new Error(`No bot found or initialized for session: ${sessionId}`);
        }
        return await bot.sendMessage(jid, message);
    }

    async shutdown() {
        logger.info('Shutting down all bots...');

        try {
            stopFlushTimer();
            await flushQueueOnShutdown();
        } catch (err) {
            logger.error({ err }, "Failed to flush message queue during shutdown");
        }

        try {
            logger.info("Saving all session data before shutdown...");
            await CustomAuthState.saveAllSessions();
            logger.info("All session data saved successfully");
        } catch (error) {
            logger.error({ err: error }, "Error saving sessions during shutdown");
        }

        for (const [sessionId, bot] of this.bots.entries()) {
            try {
                await bot.disconnect(false); 
                logger.info({ session: sessionId }, `Bot disconnected successfully.`);
            } catch (error) {
                logger.error({ session: sessionId, err: error }, `Error during bot disconnection.`);
            }
        }
        this.bots.clear(); 

        try {
            CustomAuthState.stopPeriodicSave();
            logger.info('Auth periodic save timer stopped');
        } catch (error) {
            logger.error({ err: error }, 'Error stopping periodic save timer');
        }

        try {
            const Schedule = require('./schedulers');
            await Schedule.cleanup();
            logger.info('Scheduled tasks cleaned up');
        } catch (error) {
            logger.error({ err: error }, 'Error cleaning up scheduled tasks');
        }

        if (sequelize) {
            try {
                await sequelize.close();
                logger.info('Database connection closed.');
            } catch (error) {
                logger.error({ err: error }, 'Error closing database connection.');
            }
        }
    }
}

module.exports = { BotManager };
