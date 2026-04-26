const { WhatsAppBot } = require("./bot");
const config = require('../config');
const { sequelize } = require("./database");
const { CustomAuthState } = require("./auth");
const { flushQueueOnShutdown, stopFlushTimer } = require("./store");

class BotManager {
    constructor() {
        this.bots = new Map(); 
    }

    async initializeBots() {
        config.logger.info({ sessions: config.SESSION }, `Initializing all configured bots.`);
        await CustomAuthState.deleteGarbageSessions(config.SESSION);        
        for (const sessionId of config.SESSION) {
            try {
                config.logger.info({ session: sessionId }, `Attempting to initialize bot for session.`);
                const bot = new WhatsAppBot(sessionId);
                await bot.initialize(); 
                if (bot.sock) { 
                    this.bots.set(sessionId, bot);
                    config.logger.info({ session: sessionId }, `Bot initialization scheduled. Connection status will follow.`);
                } else {
                    config.logger.error({ session: sessionId }, `Bot object for session could not be initialized (sock is null).`);
                }
            } catch (error) {
                config.logger.error({ session: sessionId, err: error }, `Overall failure to initialize bot in BotManager`);
            }
        }
    }

    // 🌟 NOUVEAU : Démarrer UN SEUL bot à la volée (À chaud)
    async startBot(sessionId) {
        if (this.bots.has(sessionId)) {
            config.logger.info({ session: sessionId }, `Bot is already running in BotManager.`);
            return;
        }

        try {
            config.logger.info({ session: sessionId }, `[API] Démarrage dynamique du bot pour la session.`);
            const bot = new WhatsAppBot(sessionId);
            await bot.initialize(); 
            
            if (bot.sock) { 
                this.bots.set(sessionId, bot);
                config.logger.info({ session: sessionId }, `[API] Bot démarré avec succès à chaud !`);
            } else {
                config.logger.error({ session: sessionId }, `Bot object could not be initialized (sock is null).`);
            }
        } catch (error) {
            config.logger.error({ session: sessionId, err: error }, `Failure to dynamically initialize bot in BotManager`);
            throw error;
        }
    }

    // 🌟 NOUVEAU : Arrêter UN SEUL bot à la volée (À chaud)
    async stopBot(sessionId) {
        const bot = this.bots.get(sessionId);
        if (bot) {
            try {
                await bot.disconnect(false); // false pour ne pas supprimer les identifiants
                this.bots.delete(sessionId);
                config.logger.info({ session: sessionId }, `[API] Bot arrêté avec succès à chaud !`);
            } catch (error) {
               config.logger.error({ session: sessionId, err: error }, `Error during dynamic bot disconnection.`);
                throw error;
            }
        } else {
            config.logger.warn({ session: sessionId }, `Cannot stop bot: Not found in running bots.`);
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
        config.logger.info('Shutting down all bots...');

        try {
          stopFlushTimer();
          await flushQueueOnShutdown();
        } catch (err) {
          config.logger.error({ err }, "Failed to flush message queue during shutdown");
        }

        try {
          config.logger.info("Saving all session data before shutdown...");
          await CustomAuthState.saveAllSessions();
          config.logger.info("All session data saved successfully");
        } catch (error) {
          config.logger.error({ err: error }, "Error saving sessions during shutdown");
        }

        for (const [sessionId, bot] of this.bots.entries()) {
            try {
                await bot.disconnect(false); 
                config.logger.info({ session: sessionId }, `Bot disconnected successfully.`);
            } catch (error) {
                config.logger.error({ session: sessionId, err: error }, `Error during bot disconnection.`);
            }
        }
        this.bots.clear(); 

        try {
            CustomAuthState.stopPeriodicSave();
            config.logger.info('Auth periodic save timer stopped');
        } catch (error) {
            config.logger.error({ err: error }, 'Error stopping periodic save timer');
        }

        try {
            const Schedule = require('./schedulers');
            await Schedule.cleanup();
            config.logger.info('Scheduled tasks cleaned up');
        } catch (error) {
            config.logger.error({ err: error }, 'Error cleaning up scheduled tasks');
        }

        if (sequelize) {
            try {
                await sequelize.close();
                config.logger.info('Database connection closed.');
            } catch (error) {
              config.logger.error({ err: error }, 'Error closing database connection.');
            }
        }
    }
}

module.exports = { BotManager };