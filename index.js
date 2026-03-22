const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    downloadMediaMessage,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore // ← IMPORTANT pour éviter les erreurs Bad MAC
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const pino = require("pino");
const readline = require("readline");
const fs = require("fs");
const qrcode = require("qrcode-terminal");
const path = require("path");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

// ========== CONFIGURATION DES DOSSIERS ==========
const logsFolder = path.join(__dirname, "logs");
const viewOnceFolder = path.join(__dirname, "view_once_media");

// Créer les dossiers s'ils n'existent pas
if (!fs.existsSync(logsFolder)) fs.mkdirSync(logsFolder, { recursive: true });
if (!fs.existsSync(viewOnceFolder)) fs.mkdirSync(viewOnceFolder, { recursive: true });

// ========== SYSTÈME DE LOGGING ==========
function logMessage(direction, sender, messageType, content, isViewOnce = false) {
    const timestamp = new Date().toISOString();
    const logFile = path.join(logsFolder, `messages_${new Date().toISOString().split('T')[0]}.log`);
    
    const logEntry = {
        timestamp,
        direction,
        sender,
        messageType,
        isViewOnce,
        content: content || "[Média]"
    };
    
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(logFile, logLine);
    
    const icon = direction === "IN" ? "📥" : "📤";
    const viewOnceTag = isViewOnce ? " 👀 [VUE UNIQUE]" : "";
    console.log(`${icon} [${timestamp}] ${sender} (${messageType})${viewOnceTag}`);
    if (content) console.log(`   💬 ${content}`);
}

// ========== STOCKAGE TEMPORAIRE DES VUES UNIQUES ==========
const pendingViewOnce = new Map();

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`📱 Utilisation de WA v${version.join('.')}, dernière version: ${isLatest}`);

    let methodeConnexion = '1';

    if (!state.creds.registered) {
        console.log("\n=============================");
        console.log("   COMMENT SE CONNECTER ?");
        console.log("=============================");
        console.log("1. Par QR Code");
        console.log("2. Par Numéro de téléphone (Code de liaison)");
        methodeConnexion = await question("\nTapez 1 ou 2, puis Entrée : ");
    }

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) // ← FIX Bad MAC
        },
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }), // Réduire les logs pour éviter le spam
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000,
        emitOwnEvents: true,
        syncFullHistory: false,
        markOnlineOnConnect: true,
        // Gestion des messages manquants
        getMessage: async (key) => {
            return { conversation: '' };
        }
    });

    if (!state.creds.registered && methodeConnexion === '2') {
        setTimeout(async () => {
            const numero = await question("\nEntrez votre numéro WhatsApp avec l'indicatif (ex: 237612345678) : ");
            const numeroNettoye = numero.replace(/[^0-9]/g, "");

            if (numeroNettoye.length < 10) {
                console.log("❌ Numéro invalide. Assurez-vous d'inclure l'indicatif pays.");
                process.exit(1);
            }

            try {
                const code = await sock.requestPairingCode(numeroNettoye);
                console.log(`\n🟢 VOTRE CODE DE LIAISON EST : ${code.match(/.{1,4}/g).join("-")}\n`);
                console.log("📱 Allez sur WhatsApp > Appareils connectés > Lier avec le numéro de téléphone.");
                console.log("⏱️  Le code expire dans quelques minutes.\n");
            } catch (error) {
                console.error("❌ Erreur lors de la demande du code :", error.message);
            }
        }, 3000);
    }

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && methodeConnexion === '1') {
            console.log("\n--- SCANNEZ LE QR CODE CI-DESSOUS ---");
            qrcode.generate(qr, { small: true });
            console.log("\n📱 Ouvrez WhatsApp > Appareils connectés > Lier un appareil\n");
        }

        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error instanceof Boom
                && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

            const statusCode = lastDisconnect?.error?.output?.statusCode;

            console.log("\n⚠️ Connexion fermée.");

            switch (statusCode) {
                case DisconnectReason.badSession:
                    console.log("❌ Session invalide. Supprimez le dossier 'auth_info' et reconnectez-vous.");
                    break;
                case DisconnectReason.connectionClosed:
                    console.log("🔌 Connexion fermée par le serveur.");
                    break;
                case DisconnectReason.connectionLost:
                    console.log("📡 Connexion perdue.");
                    break;
                case DisconnectReason.connectionReplaced:
                    console.log("🔄 Connexion remplacée (appareil connecté ailleurs).");
                    break;
                case DisconnectReason.loggedOut:
                    console.log("🚪 Déconnecté. Supprimez 'auth_info' pour recommencer.");
                    break;
                case DisconnectReason.restartRequired:
                    console.log("♻️  Redémarrage nécessaire.");
                    break;
                case DisconnectReason.timedOut:
                    console.log("⏱️  Timeout de connexion.");
                    break;
                default:
                    console.log("Raison :", lastDisconnect?.error?.message || "Inconnue");
            }

            if (shouldReconnect) {
                console.log("🔄 Tentative de reconnexion dans 5 secondes...\n");
                setTimeout(() => connectToWhatsApp(), 5000);
            } else {
                console.log("🛑 Arrêt du bot. Supprimez 'auth_info' pour recommencer à zéro.\n");
                process.exit(0);
            }
        } else if (connection === "open") {
            console.log("\n✅ =============================");
            console.log("   BOT CONNECTÉ AVEC SUCCÈS !");
            console.log("=============================\n");

            const user = sock.user;
            if (user) {
                console.log(`📱 Numéro : ${user.id.split(':')[0]}`);
                console.log(`👤 Nom : ${user.name || 'Non défini'}`);
                console.log(`📁 Logs : ${logsFolder}`);
                console.log(`👀 Vues uniques : ${viewOnceFolder}\n`);
            }
        } else if (connection === "connecting") {
            console.log("🔄 Connexion en cours...");
        }
    });

    sock.ev.on("creds.update", saveCreds);

    // ========== GESTION DES MESSAGES ENTRANTS ==========
    sock.ev.on("messages.upsert", async (m) => {
        try {
            const msg = m.messages[0];
            if (!msg.message) return;
            if (msg.key.fromMe) return; // Ignorer nos propres messages

            const remoteJid = msg.key.remoteJid;
            const sender = remoteJid.split('@')[0];
            const isGroup = remoteJid.endsWith('@g.us');

            // Extraire le texte du message
            const messageText = msg.message.conversation ||
                msg.message.extendedTextMessage?.text ||
                '';

            // ========== DÉTECTION DES VUES UNIQUES ==========
            const viewOnceMessage = msg.message.viewOnceMessageV2?.message ||
                msg.message.viewOnceMessage?.message;

            if (viewOnceMessage) {
                console.log(`\n👀 ========================================`);
                console.log(`   MÉDIA À VUE UNIQUE DÉTECTÉ !`);
                console.log(`========================================`);

                const isImage = viewOnceMessage.imageMessage;
                const isVideo = viewOnceMessage.videoMessage;
                const isAudio = viewOnceMessage.audioMessage;

                let mediaType = "inconnu";
                if (isImage) mediaType = "image";
                if (isVideo) mediaType = "vidéo";
                if (isAudio) mediaType = "audio";

                logMessage("IN", sender, `VIEW_ONCE_${mediaType.toUpperCase()}`, null, true);

                if (isImage || isVideo || isAudio) {
                    console.log(`📥 Téléchargement du ${mediaType} en cours...`);

                    try {
                        // Créer un message factice pour le téléchargement
                        const fakeMsg = {
                            key: msg.key,
                            message: viewOnceMessage
                        };

                        const buffer = await downloadMediaMessage(
                            fakeMsg,
                            'buffer',
                            {},
                            {
                                logger: pino({ level: 'silent' }),
                                reuploadRequest: sock.updateMediaMessage
                            }
                        );

                        // Déterminer l'extension
                        let extension = '.bin';
                        if (isImage) {
                            const mimetype = viewOnceMessage.imageMessage.mimetype || '';
                            if (mimetype.includes('png')) extension = '.png';
                            else if (mimetype.includes('webp')) extension = '.webp';
                            else extension = '.jpeg';
                        }
                        if (isVideo) extension = '.mp4';
                        if (isAudio) extension = '.ogg';

                        // ========== SAUVEGARDE AUTOMATIQUE (SANS .save) ==========
                        const fileName = `ViewOnce_${sender}_${Date.now()}${extension}`;
                        const filePath = path.join(viewOnceFolder, fileName);

                        // Sauvegarder sur le disque IMMÉDIATEMENT
                        fs.writeFileSync(filePath, buffer);

                        console.log(`\n💾 ========================================`);
                        console.log(`   VUE UNIQUE SAUVEGARDÉE AUTOMATIQUEMENT !`);
                        console.log(`========================================`);
                        console.log(`📁 Fichier : ${fileName}`);
                        console.log(`📂 Dossier : ${viewOnceFolder}\n`);

                        logMessage("IN", sender, "VIEW_ONCE_SAVED", `Auto-save → ${fileName}`, true);

                    } catch (error) {
                        console.error(`❌ Erreur lors du téléchargement du ${mediaType} :`, error.message);
                        logMessage("IN", sender, `VIEW_ONCE_${mediaType.toUpperCase()}_ERROR`, error.message, true);
                    }
                }
            }

            // ========== LOGGING DES MESSAGES NORMAUX ==========
            let messageType = "TEXT";
            if (msg.message.imageMessage) messageType = "IMAGE";
            if (msg.message.videoMessage) messageType = "VIDEO";
            if (msg.message.audioMessage) messageType = "AUDIO";
            if (msg.message.documentMessage) messageType = "DOCUMENT";
            if (msg.message.stickerMessage) messageType = "STICKER";

            logMessage("IN", sender, messageType, messageText, false);

            // ========== COMMANDE PING ==========
            if (messageText.toLowerCase() === 'ping') {
                await sock.sendMessage(remoteJid, {
                    text: '🏓 Pong! Le bot fonctionne correctement.'
                });
                logMessage("OUT", remoteJid.split('@')[0], "TEXT", "Pong!", false);
                console.log('✅ Réponse envoyée\n');
            }

        } catch (error) {
            // Ignorer silencieusement les erreurs Bad MAC
            if (error.message && error.message.includes('Bad MAC')) {
                return; // Ne rien afficher pour les erreurs Bad MAC
            }
            console.error('❌ Erreur lors du traitement du message :', error.message);
        }
    });

    return sock;
}

// Gestion des erreurs non capturées
process.on('uncaughtException', (err) => {
    // Ignorer les erreurs Bad MAC
    if (err.message && err.message.includes('Bad MAC')) {
        return;
    }
    console.error('❌ Erreur non capturée :', err);
});

process.on('unhandledRejection', (err) => {
    // Ignorer les erreurs Bad MAC
    if (err.message && err.message.includes('Bad MAC')) {
        return;
    }
    console.error('❌ Promesse rejetée :', err);
});

// Démarrage du bot
console.log("\n🤖 ========================================");
console.log("   BOT WHATSAPP - SAUVEGARDE AUTO");
console.log("========================================\n");
console.log("📝 Fonctionnalités :");
console.log("   • Logging de tous les messages");
console.log("   • Sauvegarde AUTOMATIQUE des vues uniques");
console.log("   • Pas besoin de taper .save\n");

connectToWhatsApp().catch((err) => {
    console.error('❌ Erreur fatale :', err);
    process.exit(1);
});
