const { WhatsAppBot } = require("./bot");
const { logger, SESSION } = require('../config');
const { sequelize, BotVariable } = require("./database");
const { CustomAuthState } = require("./auth");
const { flushQueueOnShutdown, stopFlushTimer } = require("./store");

class BotManager {
    constructor() {
        this.bots = new Map(); 
    }

    async initializeBots() {
        let dbSessions = [];
        try {
            const [botVar] = await BotVariable.findOrCreate({
                where: { key: 'SESSION' },
                defaults: { value: '' }
            });
            if (botVar.value) {
                dbSessions = botVar.value.split(',').filter(Boolean);
            }
        } catch (dbErr) {
            logger.error({ err: dbErr }, "Failed to read SESSION from BotVariable during initializeBots");
        }

        const allSessions = [...new Set([...SESSION, ...dbSessions])];

        logger.info({ sessions: allSessions }, `Initializing all configured bots.`);
        await CustomAuthState.deleteGarbageSessions(allSessions);        
        
        for (const sessionId of allSessions) {
            try {
                logger.info({ session: sessionId }, `Attempting to initialize bot for session.`);
                const bot = new WhatsAppBot(sessionId);
                await bot.initialize(); 
                if (bot.sock) { 
                    this.bots.set(sessionId, bot);
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
                let sessionsArray = botVar.value.split(',').filter(Boolean);
                if (sessionsArray.includes(sessionId)) {
                    sessionsArray = sessionsArray.filter(s => s !== sessionId);
                    botVar.value = sessionsArray.join(',');
                    await botVar.save();
                    logger.info({ session: sessionId }, `Session deleted from BotVariable database due to failure.`);
                }
            }
        } catch (err) {
            logger.error({ session: sessionId, err }, "Failed to remove faulty session from DB");
        }
    }

    async startSession(sessionId) {
        if (this.bots.has(sessionId)) {
            return { success: false, message: 'La session est déjà active sur le serveur.' };
        }
        try {
            logger.info({ session: sessionId }, `Attempting to initialize bot dynamically.`);
            const bot = new WhatsAppBot(sessionId);
            await bot.initialize(); 
            if (bot.sock) { 
                this.bots.set(sessionId, bot);
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
        return this.bots.get(sessionId);
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
