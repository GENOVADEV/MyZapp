const { WhatsAppBot } = require("./bot");
const { logger, SESSION } = require('../config');
const { sequelize, BotVariable, WhatsappSession } = require("./database");
const { CustomAuthState } = require("./auth");
const { flushQueueOnShutdown, stopFlushTimer } = require("./store");

class BotManager {
    constructor() {
        this.bots = new Map(); // Key: sessionId (string) -> WhatsAppBot instance
        this.broadcastStates = new Map(); // Key: sessionId -> Broadcast state object
    }

    normalizeSessionId(session) {
        if (!session) return "";
        let s = String(session).trim();
        if (s.startsWith("RGNK~")) {
            return s.split("~")[1] || s;
        }
        return s;
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
                const bot = new WhatsAppBot(sessionId);
                await bot.initialize(); 
                if (bot.sock) { 
                    this.bots.set(sessionId, bot);
                    if (normId !== sessionId) {
                        this.bots.set(normId, bot);
                    }
                    logger.info({ session: sessionId }, `Bot initialization scheduled. Connection status will follow.`);
                } else {
                    logger.error({ session: sessionId }, `Bot object for session could not be initialized (sock is null).`);
                    await this.removeSessionFromDB(sessionId);
                }
            } catch (error) {
                logger.error({ session: sessionId, err: error }, `Overall failure to initialize bot in BotManager`);
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
        if (this.bots.has(sessionId) || this.bots.has(normId)) {
            return { success: true, message: 'La session est déjà active sur le serveur.' };
        }
        try {
            logger.info({ session: sessionId }, `Attempting to initialize bot dynamically.`);
            const bot = new WhatsAppBot(sessionId);
            await bot.initialize(); 
            if (bot.sock) { 
                this.bots.set(sessionId, bot);
                if (normId !== sessionId) {
                    this.bots.set(normId, bot);
                }
                logger.info({ session: sessionId }, `Bot initialized dynamically.`);
                return { success: true, message: 'La session a été initialisée et démarrée avec succès.' };
            } else {
                logger.error({ session: sessionId }, `Bot object for session could not be initialized (sock is null).`);
                return { success: false, message: "Impossible d'initialiser le bot (sock is null)." };
            }
        } catch (error) {
            logger.error({ session: sessionId, err: error }, `Overall failure to initialize bot dynamically`);
            return { success: false, error: error.message };
        }
    }

    getBot(sessionId) {
        if (!sessionId) return null;
        const normId = this.normalizeSessionId(sessionId);
        return this.bots.get(sessionId) || this.bots.get(normId) || null;
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
