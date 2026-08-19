const path = require("path");
const fs = require("fs");
if (fs.existsSync("./config.env")) {
  require("dotenv").config({ path: "./config.env" });
}

const { suppressLibsignalLogs } = require("./core/helpers");

suppressLibsignalLogs();

const { initializeDatabase } = require("./core/database");
const { BotManager } = require("./core/manager");
const config = require("./config");
const { SESSION, logger } = config;
const http = require("http");
const {
  ensureTempDir,
  TEMP_DIR,
  initializeKickBot,
  cleanupKickBot,
} = require("./core/helpers");

async function main() {
  ensureTempDir();
  logger.info(`Created temporary directory at ${TEMP_DIR}`);
  console.log(`Raganork v${require("./package.json").version}`);
  console.log(`- Configured sessions: ${SESSION.join(", ")}`);
  logger.info(`Configured sessions: ${SESSION.join(", ")}`);
  if (SESSION.length === 0) {
    const warnMsg =
      "⚠️ No sessions configured. Please set SESSION environment variable.";
    console.warn(warnMsg);
    logger.warn(warnMsg);
    return;
  }

  try {
    await initializeDatabase();
    console.log("- Database initialized");
    logger.info("Database initialized successfully.");
  } catch (dbError) {
    console.error(
      "🚫 Failed to initialize database or load configuration. Bot cannot start.",
      dbError
    );
    logger.fatal(
      "🚫 Failed to initialize database or load configuration. Bot cannot start.",
      dbError
    );
    process.exit(1);
  }

  const botManager = new BotManager();

  const shutdownHandler = async (signal) => {
    console.log(`\nReceived ${signal}, shutting down...`);
    logger.info(`Received ${signal}, shutting down...`);
    cleanupKickBot();
    await botManager.shutdown();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdownHandler("SIGINT"));
  process.on("SIGTERM", () => shutdownHandler("SIGTERM"));

  await botManager.initializeBots();
  console.log("- Bot initialization complete.");
  logger.info("Bot initialization complete");

  initializeKickBot();

  const startServer = () => {
    const PORT = process.env.PORT || 3001;
    const express = require('express');
    const cors = require('cors');
    const app = express();
    
    app.use(cors());
    app.use(express.json());

    app.get('/health', (req, res) => {
      res.send('OK');
    });

    app.post('/api/sessions', async (req, res) => {
      const { session } = req.body;
      
      if (!session || !session.startsWith('RGNK~')) {
        return res.status(400).json({ success: false, error: 'Format de session invalide' });
      }

      try {
        const { BotVariable } = require('./core/database');
        const [botVar] = await BotVariable.findOrCreate({
          where: { key: 'SESSION' },
          defaults: { value: session }
        });
        
        if (!botVar.value.includes(session)) {
          botVar.value = botVar.value + ',' + session;
          await botVar.save();
        }
        
        logger.info(`Nouvelle session enregistrée en base de données: ${session}`);

        // Démarrage dynamique du bot
        const sessionIdToStart = session.includes('~') ? session.split('~')[1].trim() : session;
        const startResult = await botManager.startSession(sessionIdToStart);
        
        if (startResult.success) {
            res.json({ success: true, message: startResult.message });
        } else {
            res.status(500).json({ success: false, error: 'Session enregistrée mais le démarrage a échoué: ' + (startResult.message || startResult.error) });
        }
      } catch (error) {
        logger.error('Erreur API sessions:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur interne' });
      }
    });

    app.get('/', (req, res) => {
      res.send('Raganork Bot is running!');
    });

    app.use((req, res) => {
      res.status(404).send('Route non trouvée');
    });

    app.listen(PORT, () => {
      logger.info(`Express API listening on port ${PORT}`);
    });
  };

  if (process.env.USE_SERVER !== "false") startServer();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Fatal error in main execution: ${error.message}`, error);
    logger.fatal({ err: error }, `Fatal error in main execution`);
    process.exit(1);
  });
}
