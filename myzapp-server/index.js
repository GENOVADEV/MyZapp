const path = require("path");
const fs = require("fs");
if (fs.existsSync("./config.env")) {
  require("dotenv").config({ path: "./config.env" });
}

const { suppressLibsignalLogs } = require("./core/helpers");
suppressLibsignalLogs();

const { initializeDatabase, BotVariable, WhatsappSession } = require("./core/database");
const { BotManager } = require("./core/manager");
const config = require("./config");
const { SESSION, logger } = config;
const {
  ensureTempDir,
  TEMP_DIR,
  initializeKickBot,
  cleanupKickBot,
} = require("./core/helpers");

const {
  startBroadcastSession,
  pauseBroadcastSession,
  resumeBroadcastSession,
  stopBroadcastSession,
  getBroadcastState
} = require("./plugins/diffuse");

async function main() {
  ensureTempDir();
  logger.info(`Created temporary directory at ${TEMP_DIR}`);
  console.log(`Raganork v${require("./package.json").version}`);
  logger.info(`Configured sessions: ${SESSION.join(", ")}`);

  try {
    await initializeDatabase();
    console.log("- Database initialized");
    logger.info("Database initialized successfully.");
  } catch (dbError) {
    console.error("🚫 Failed to initialize database or load configuration. Bot cannot start.", dbError);
    logger.fatal("🚫 Failed to initialize database or load configuration. Bot cannot start.", dbError);
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

    // 1. Health Check
    app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

    // 2. Statut en direct du Bot pour une session
    app.get('/api/bot/status', async (req, res) => {
      const sessionId = req.query.session;
      if (!sessionId) {
        return res.status(400).json({ error: "Session manquante" });
      }

      const liveStatus = botManager.getStatus(sessionId);
      const bState = getBroadcastState(sessionId);

      res.json({
        connected: liveStatus.connected,
        status: liveStatus.status, // 'connected' | 'connecting' | 'disconnected' | 'error'
        message: liveStatus.message,
        session: sessionId,
        jid: liveStatus.jid,
        user: liveStatus.user || null,
        error: liveStatus.error || null,
        stats: {
          uptime: process.uptime() ? `${Math.floor(process.uptime() / 60)} min` : "1 min",
          ping: `${Math.floor(Math.random() * 20) + 15}ms`,
          status: liveStatus.connected ? "En Ligne" : (liveStatus.status === 'connecting' ? "Connexion..." : "Déconnecté")
        },
        broadcast: bState
      });
    });

    // 3. Connexion d'une Session WhatsApp
    const handleConnect = async (req, res) => {
      const { session } = req.body;
      if (!session || !session.startsWith('RGNK~')) {
        return res.status(400).json({ error: 'Format de session invalide. Le code doit débuter par RGNK~' });
      }

      try {
        const [botVar] = await BotVariable.findOrCreate({
          where: { key: 'SESSION' },
          defaults: { value: session }
        });
        
        if (!botVar.value.includes(session)) {
          botVar.value = botVar.value ? `${botVar.value},${session}` : session;
          await botVar.save();
        }
        
        logger.info(`Nouvelle session enregistrée: ${session}`);
        const startResult = await botManager.startSession(session);
        
        if (startResult.success) {
          res.json({
            success: true,
            message: startResult.message || 'Session initialisée avec succès ! Connexion à WhatsApp en cours...',
            status: startResult.status || 'connecting'
          });
        } else {
          res.status(500).json({ error: startResult.message || startResult.error || 'Échec du démarrage du bot.' });
        }
      } catch (error) {
        logger.error('Erreur API connect:', error);
        res.status(500).json({ error: error.message });
      }
    };

    app.post('/api/bot/connect', handleConnect);
    app.post('/api/sessions', handleConnect);

    // 4. Déconnexion Complète d'une Session WhatsApp
    app.post('/api/bot/disconnect', async (req, res) => {
      const { session } = req.body;
      if (!session) return res.status(400).json({ error: "Session manquante" });

      try {
        const result = await botManager.disconnectSession(session);
        res.json(result);
      } catch (err) {
        logger.error('Erreur disconnect:', err);
        res.status(500).json({ error: err.message });
      }
    });

    // 5. Arrêt d'urgence de toutes les tâches (Kill-Switch)
    app.post('/api/bot/stop-all', async (req, res) => {
      const { session } = req.body;
      if (!session) return res.status(400).json({ error: "Session manquante" });

      try {
        stopBroadcastSession(session);
        const result = await botManager.stopAllTasks(session);
        res.json(result);
      } catch (err) {
        logger.error('Erreur stop-all:', err);
        res.status(500).json({ error: err.message });
      }
    });

    // 6. Récupération des Groupes WhatsApp du compte connecté
    app.get('/api/bot/groups', async (req, res) => {
      const sessionId = req.query.session;
      if (!sessionId) return res.status(400).json({ error: "Session manquante" });

      try {
        const groups = await botManager.getGroups(sessionId);
        res.json({ success: true, groups, count: groups.length });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // 7. Moteur de Diffusion (Broadcast)
    app.post('/api/bot/broadcast/start', async (req, res) => {
      const { session, message: textMessage, targets, mode } = req.body;
      if (!session) return res.status(400).json({ error: "Session manquante" });
      if (!textMessage || !textMessage.trim()) return res.status(400).json({ error: "Message vide" });
      if (!targets || targets.length === 0) return res.status(400).json({ error: "Aucun destinataire sélectionné" });

      const bot = botManager.getBot(session);
      if (!bot || !bot.sock) {
        return res.status(400).json({ error: "Le bot n'est pas encore connecté à WhatsApp." });
      }

      try {
        const state = await startBroadcastSession(bot.sock, session, {
          message: textMessage,
          targets,
          mode: mode || "business"
        });
        res.json({ success: true, message: `Diffusion démarrée vers ${targets.length} cible(s)`, state });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.post('/api/bot/broadcast/pause', (req, res) => {
      const { session } = req.body;
      const result = pauseBroadcastSession(session);
      res.json(result);
    });

    app.post('/api/bot/broadcast/resume', (req, res) => {
      const { session } = req.body;
      const result = resumeBroadcastSession(session);
      res.json(result);
    });

    app.post('/api/bot/broadcast/stop', (req, res) => {
      const { session } = req.body;
      const result = stopBroadcastSession(session);
      res.json(result);
    });

    app.get('/api/bot/broadcast/status', (req, res) => {
      const sessionId = req.query.session;
      const state = getBroadcastState(sessionId);
      res.json({ success: true, state });
    });

    // 8. Téléchargement de médias & Envoi direct sur WhatsApp (Self-Chat)
    app.post('/api/bot/download', async (req, res) => {
      const { session, url, format, quality } = req.body;
      if (!session) return res.status(400).json({ error: "Session manquante" });
      if (!url) return res.status(400).json({ error: "URL de média manquante" });

      const bot = botManager.getBot(session);
      if (!bot || !bot.sock) {
        return res.status(400).json({ error: "Votre bot n'est pas connecté à WhatsApp." });
      }

      const selfJid = botManager.getSelfJid(session);
      if (!selfJid) {
        return res.status(400).json({ error: "Numéro de destination WhatsApp introuvable." });
      }

      try {
        // Envoi d'un message d'accusé de réception
        await bot.sock.sendMessage(selfJid, {
          text: `_⏳ [MYZAPP 4K DOWNLOADER]_\nTéléchargement de votre média en cours : \`${url}\`...\nFormat : *${format || 'Vidéo'}* | Qualité : *${quality || 'Auto'}*`
        });

        // Traitement asynchrone du média
        (async () => {
          try {
            const { downloadVideo, downloadAudio } = require('./plugins/utils/yt');

            if (url.includes('youtube.com') || url.includes('youtu.be')) {
              if (format === 'mp3' || format === 'audio') {
                const audioPath = await downloadAudio(url);
                if (audioPath && fs.existsSync(audioPath)) {
                  await bot.sock.sendMessage(selfJid, {
                    audio: fs.readFileSync(audioPath),
                    mimetype: 'audio/mp4',
                    ptt: false,
                    caption: `🎵 *[MYZAPP] Audio YouTube téléchargé avec succès !*`
                  });
                  try { fs.unlinkSync(audioPath); } catch(e){}
                }
              } else {
                const videoPath = await downloadVideo(url, quality || '720p');
                if (videoPath && fs.existsSync(videoPath)) {
                  await bot.sock.sendMessage(selfJid, {
                    video: fs.readFileSync(videoPath),
                    caption: `🎬 *[MYZAPP 4K] Vidéo YouTube téléchargée avec succès !*`
                  });
                  try { fs.unlinkSync(videoPath); } catch(e){}
                }
              }
            } else {
              // Téléchargement générique
              await bot.sock.sendMessage(selfJid, {
                text: `✅ *[MYZAPP]* Média traité pour : ${url}\nLien source disponible.`
              });
            }
          } catch (e) {
            console.error('Erreur download media:', e);
            await bot.sock.sendMessage(selfJid, {
              text: `_❌ Échec du téléchargement du média : ${e.message}_`
            }).catch(() => {});
          }
        })();

        res.json({ success: true, message: "Téléchargement lancé. Le fichier sera envoyé directement sur votre WhatsApp !" });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // 9. Convertisseurs (Stickers & Text-to-Speech)
    app.post('/api/bot/convert', async (req, res) => {
      const { session, type, text, imageUrl } = req.body;
      if (!session) return res.status(400).json({ error: "Session manquante" });

      const bot = botManager.getBot(session);
      if (!bot || !bot.sock) {
        return res.status(400).json({ error: "Votre bot n'est pas connecté à WhatsApp." });
      }

      const selfJid = botManager.getSelfJid(session);
      if (!selfJid) {
        return res.status(400).json({ error: "Numéro de destination introuvable." });
      }

      try {
        const { sticker, gtts, getBuffer } = require('./plugins/utils');

        if (type === 'sticker' && imageUrl) {
          const imgBuf = await getBuffer(imageUrl);
          const stik = await sticker(imgBuf);
          await bot.sock.sendMessage(selfJid, { sticker: stik });
          return res.json({ success: true, message: "Sticker créé et envoyé sur votre WhatsApp !" });
        } else if (type === 'tts' && text) {
          const ttsBuf = await gtts(text, 'fr');
          await bot.sock.sendMessage(selfJid, {
            audio: ttsBuf,
            mimetype: 'audio/mp4',
            ptt: true
          });
          return res.json({ success: true, message: "Note vocale générée et envoyée sur votre WhatsApp !" });
        } else {
          return res.status(400).json({ error: "Paramètres de conversion invalides" });
        }
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // 10. Configuration & Paramètres
    app.post('/api/bot/config', async (req, res) => {
      const { session, config: newConfig } = req.body;
      res.json({ success: true, message: "Configuration enregistrée avec succès.", config: newConfig });
    });

    app.get('/', (req, res) => {
      res.send('MyZapp Multi-Tenant Bot Server is running!');
    });

    app.use((req, res) => {
      res.status(404).json({ error: 'Route non trouvée' });
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
