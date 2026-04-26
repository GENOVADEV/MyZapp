const path = require("path");
const fs = require("fs");
const { UserDB, WhatsAppSessionDB } = require("./plugins/utils/db/models");
if (fs.existsSync("./config.env")) {
  require("dotenv").config({ path: "./config.env" });
}

const { suppressLibsignalLogs } = require("./core/helpers");

suppressLibsignalLogs();

const { initializeDatabase } = require("./core/database");
const { BotManager } = require("./core/manager");
const config = require("./config");
// ⚠️ CHANGEMENT : On a retiré SESSION d'ici pour utiliser config.SESSION directement
const { logger } = config;
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

  // 1. D'abord, on initialise la base de données pour être sûr qu'elle est prête
  try {
    await initializeDatabase();
    await config.sequelize.sync();
    console.log("- Database tables synced");
    // async function seedData() {
    //   try {
    //     // On utilise les nouveaux modèles AppUser et AppWhatsAppSession
    //     const [user, created] = await UserDB.findOrCreate({
    //       where: { name: "Admin" },
    //       defaults: { plan: "FREE" }
    //     });

    //     const sessions = ["DzOoeUY8", "wlsa5usE"];
    //     for (const id of sessions) {
    //       await WhatsAppSessionDB.findOrCreate({
    //         where: { id: id },
    //         defaults: { sessionId: id, userId: user.id }
    //       });
    //     }

    //     console.log("✅ Sessions DzOoeUY8 et wlsa5usE prêtes !");
    //   } catch (e) {
    //     console.error("❌ Erreur seedData:", e.message);
    //   }
    // };
    // await new Promise(res => setTimeout(res, 2000));
    // await seedData();
    console.log("- Database initialized and ready");
    await new Promise(resolve => setTimeout(resolve, 500));
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

  // =========================================================================
  // 2. NOUVEAU : On récupère les sessions depuis PostgreSQL
  // =========================================================================
  try {
    const [sessionsFromDB] = await config.sequelize.query('SELECT id FROM "AppWhatsAppSessions"');
    console.log('Sessions récupérées de la BD :', sessionsFromDB);

    if (sessionsFromDB && sessionsFromDB.length > 0) {
      const formattedSessions = sessionsFromDB.map(row => `RGNK~${row.id}`);
      const sessionString = formattedSessions.join(',');

      // On met à jour la configuration en direct
      config.SESSION = sessionsFromDB.map(row => {
        return row.id.replace('RGNK~', '').trim();
      }); console.log(`🔌 Sessions chargées depuis la BD : ${sessionString}`);
    } else {
      console.log("⚠️ Aucune session trouvée en BD. Attente de création via l'API.");
      config.SESSION = [];
    }
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des sessions depuis la BD :", error.message);
  }

  // 3. On affiche et on vérifie les sessions (avec config.SESSION mis à jour)
  console.log(`- Configured sessions: ${config.SESSION.join(", ")}`);
  logger.info(`Configured sessions: ${config.SESSION.join(", ")}`);

  if (config.SESSION.length === 0) {
    const warnMsg ="⚠️ No sessions configured. Please add a session in the database or set SESSION environment variable.";
    console.warn(warnMsg);
    logger.warn(warnMsg);
    const botManager = new BotManager();
  }
  // =========================================================================

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
    const API_SECRET = process.env.API_SECRET || "mon_mot_de_passe_super_secret";

    // Fonction utilitaire pour lire le "body" (JSON) d'une requête POST
    const readJsonBody = (req) => {
      return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch (e) {
            reject(new Error('JSON invalide'));
          }
        });
      });
    };

    // ============================================================================
    // 🗺️ TABLE DES ROUTES (C'est ici que tu ajoutes de nouvelles API facilement)
    // ============================================================================
    const routes = {
      // 1. ROUTE DE SANTÉ (GET)
      '/health': async (req, res, url) => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "OK", uptime: process.uptime() }));
      },

      // 2. STATUT D'UNE SESSION (GET)
      '/status': async (req, res, url) => {
        const sessionId = url.searchParams.get("sessionId");
        if (!sessionId) throw new Error("Session ID manquant");

        // Exemple de vérification (à adapter selon ton BotManager)
        const isRunning = config.SESSION.includes(sessionId);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ sessionId, status: isRunning ? "online" : "offline" }));
      },

      // 3. DÉMARRER UNE SESSION (POST)
      '/start-session': async (req, res, url, body) => {
        const { sessionId } = body;
        if (!sessionId) throw new Error("ID de session manquant");

        console.log(`📡 Demande de démarrage pour : ${sessionId}`);

        if (!config.SESSION.includes(sessionId)) {
          config.SESSION.push(sessionId);
          await botManager.initializeBots(); // Relance l'initialisation
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, message: `Session ${sessionId} en cours de démarrage` }));
        } else {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, message: `La session ${sessionId} tourne déjà.` }));
        }
      },

      // 4. ARRÊTER UNE SESSION (POST)
      '/stop-session': async (req, res, url, body) => {
        const { sessionId } = body;
        if (!sessionId) throw new Error("ID de session manquant");

        console.log(`🛑 Demande d'arrêt pour : ${sessionId}`);

        config.SESSION = config.SESSION.filter(s => s !== sessionId);

        // Si Raganork a une fonction pour détruire la session, appelle-la ici
        if (typeof botManager.stopBot === 'function') {
          await botManager.stopBot(sessionId);
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, message: `Session ${sessionId} arrêtée` }));
      }
    };

    // ============================================================================
    // 🚀 LE SERVEUR HTTP (Moteur)
    // ============================================================================
    const server = http.createServer(async (req, res) => {
      // 1. Configuration CORS (Indispensable pour Next.js)
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      // Réponse rapide pour la pré-vérification CORS
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
      }

      const url = new URL(req.url, `http://${req.headers.host}`);
      const routeHandler = routes[url.pathname];

      try {
        // 2. Vérification de sécurité (Authentification)
        // On ignore la sécurité pour /health, mais on l'exige pour le reste
        if (url.pathname !== '/health') {
          const authHeader = req.headers['authorization'];
          const expectedToken = `Bearer ${API_SECRET}`; // Assure-toi que API_SECRET est défini dans ton fichier

          if (authHeader !== expectedToken) {
            res.writeHead(401, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: "Non autorisé. Jeton invalide." }));
          }
        }

        // 3. Exécution de la route
        if (routeHandler) {
          // Si c'est un POST, on lit le body en JSON, sinon on passe un objet vide
          const body = req.method === 'POST' ? await readJsonBody(req) : {};

          // On appelle la fonction de la route
          await routeHandler(req, res, url, body);
        } else {
          // 4. Route non trouvée (404)
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Route introuvable" }));
        }

      } catch (error) {
        // 5. Gestion globale des erreurs
        console.error(`❌ Erreur API sur ${url.pathname}:`, error.message);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });

    server.listen(PORT, () => {
      console.log(`🌐 Serveur API Raganork en écoute permanente sur le port ${PORT}`);
      console.log(`En attente des ordres de Next.js...`);
    });
  };
  try {
    if (config.SESSION && config.SESSION.length > 0) {
      console.log(`- Démarrage des sessions existantes : ${config.SESSION.join(', ')}`);
      botManager.initializeBots().catch(err => console.error("Erreur d'initialisation des bots:", err));
    } else {
      console.log("⚠️ Aucune session au démarrage. Le serveur API est prêt à en recevoir une !");
    }
  } catch (error) {
    console.error("❌ Erreur critique lors du démarrage :", error);
  }
  if (process.env.USE_SERVER !== "false") startServer();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Fatal error in main execution: ${error.message}`, error);
    logger.fatal({ err: error }, `Fatal error in main execution`);
    process.exit(1);
  });
}