// src/app/api/users/auth/myzapplogin/route.ts
import { NextResponse } from "next/server";
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore // ← IMPORTANT
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import path from "path";
import fs from "fs";
import QRCode from 'qrcode';

// ============================================================================
// TYPES
// ============================================================================

interface AuthRequest {
  method: "qr" | "phone";
  phone?: string;
}

interface AuthResponse {
  success?: boolean;
  type?: "qr" | "phone";
  qr?: string;
  code?: string;
  message?: string;
  error?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const TIMEOUT_DURATION = 60000; // 60 secondes (comme dans index.js)
const PAIRING_CODE_DELAY = 3000; // 3 secondes
const QR_OPTIONS = {
  errorCorrectionLevel: 'M' as const,
  type: 'image/png' as const,
  quality: 0.92,
  margin: 1,
  width: 300,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  }
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Nettoie le numéro de téléphone pour WhatsApp
 */
function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

/**
 * Valide le numéro de téléphone
 */
function validatePhoneNumber(phone: string): boolean {
  const cleaned = cleanPhoneNumber(phone);
  return cleaned.length >= 8 && cleaned.length <= 15;
}

/**
 * Génère un QR code en base64 à partir du texte
 */
async function generateQRCodeImage(qrText: string): Promise<string> {
  try {
    const qrDataURL = await QRCode.toDataURL(qrText, QR_OPTIONS);
    return qrDataURL;
  } catch (error) {
    console.error("Erreur génération QR:", error);
    throw new Error("Impossible de générer le QR code");
  }
}

/**
 * Crée le dossier d'authentification s'il n'existe pas
 */
function ensureAuthFolder(authFolder: string): void {
  if (!fs.existsSync(authFolder)) {
    fs.mkdirSync(authFolder, { recursive: true });
    console.log(`📁 Dossier créé: ${authFolder}`);
  }
}

/**
 * Supprime le dossier d'authentification
 */
function deleteAuthFolder(): boolean {
  const authFolder = path.join(process.cwd(), "auth_info_baileys");

  if (!fs.existsSync(authFolder)) {
    console.log("Le dossier auth_info_baileys n'existe pas");
    return true;
  }

  try {
    fs.rmSync(authFolder, {
      recursive: true,
      force: true
    });
    console.log("🧹 Dossier auth_info_baileys supprimé");
    return true;
  } catch (error) {
    console.error("❌ Erreur suppression dossier:", error);
    return false;
  }
}

/**
 * Vérifie si une session existe déjà
 */
function hasExistingSession(authFolder: string): boolean {
  if (!fs.existsSync(authFolder)) return false;

  const files = fs.readdirSync(authFolder);
  return files.length > 0 && files.some(file => file.startsWith('creds.json'));
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(req: Request) {
  let sock: ReturnType<typeof makeWASocket> | null = null;
  let timeoutId: NodeJS.Timeout | null = null;

  try {
    // 1. Validation de la requête
    const body: AuthRequest = await req.json();
    const { method, phone } = body;

    console.log(`\n🔐 ========================================`);
    console.log(`   TENTATIVE DE CONNEXION WHATSAPP`);
    console.log(`========================================`);
    console.log(`📱 Méthode: ${method}`);
    if (phone) console.log(`📞 Numéro: ${phone}`);

    // Validation spécifique pour la méthode phone
    if (method === "phone") {
      if (!phone) {
        return NextResponse.json(
          { error: "Numéro de téléphone requis pour cette méthode." },
          { status: 400 }
        );
      }

      if (!validatePhoneNumber(phone)) {
        return NextResponse.json(
          { error: "Format de numéro de téléphone invalide. Utilisez le format international (ex: +33612345678)" },
          { status: 400 }
        );
      }
    }

    // 2. Configuration du dossier d'authentification
    const authFolder = path.join(process.cwd(), "auth_info_baileys");
    ensureAuthFolder(authFolder);

    // 3. Vérification session existante
    const sessionExists = hasExistingSession(authFolder);
    if (sessionExists) {
      console.log("⚠️ Session existante détectée - Nettoyage...");
      deleteAuthFolder();
      ensureAuthFolder(authFolder);
    }

    // 4. Récupération de la dernière version de Baileys
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`📱 Version Baileys: ${version.join('.')} ${isLatest ? '(latest)' : ''}`);

    // 5. Initialisation de l'état d'authentification
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);

    // 6. Création de la connexion WhatsApp
    return await new Promise<NextResponse<AuthResponse>>((resolve, reject) => {

      // Timeout de sécurité (optionnel - commenté pour stabilité)
      timeoutId = setTimeout(() => {
        console.error("⏱️ Timeout - Nettoyage de la session");
        if (sock) {
          try {
            (sock as any).end(undefined);
          } catch (e) {
            console.error("Erreur fermeture socket:", e);
          }
        }
        deleteAuthFolder();
        resolve(NextResponse.json(
          { error: "Délai d'attente dépassé. Veuillez réessayer." },
          { status: 408 }
        ));
      }, TIMEOUT_DURATION);

      // Variables de contrôle
      let qrCodeReceived = false;
      let pairingCodeSent = false;
      let isResolved = false;

      // Helper pour résoudre une seule fois
      const resolveOnce = (response: NextResponse<AuthResponse>) => {
        if (!isResolved) {
          isResolved = true;
          if (timeoutId) clearTimeout(timeoutId);
          resolve(response);
        }
      };

      try {
        // Création du socket WhatsApp (CONFIGURATION IDENTIQUE À INDEX.JS)
        sock = makeWASocket({
          version,
          auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) // ← FIX Bad MAC
          },
          printQRInTerminal: false,
          logger: pino({ level: "fatal" }), // ← "fatal" comme index.js
          browser: ["Ubuntu", "Chrome", "20.0.04"], // ← Même que index.js
          connectTimeoutMs: 60000,
          defaultQueryTimeoutMs: 0, // ← 0 comme index.js
          keepAliveIntervalMs: 10000,
          emitOwnEvents: true,
          syncFullHistory: false,
          markOnlineOnConnect: true,
          // Gestion des messages manquants (évite les erreurs)
          getMessage: async (key) => {
            return { conversation: '' };
          },
          // Options de reconnexion
          retryRequestDelayMs: 250,
          maxMsgRetryCount: 5,
        });

        // Sauvegarde des credentials
        sock.ev.on("creds.update", async () => {
          try {
            await saveCreds();
            console.log("💾 Credentials sauvegardés");
          } catch (error) {
            console.error("❌ Erreur sauvegarde credentials:", error);
          }
        });

        // Gestion de la connexion par code de jumelage
        if (method === "phone" && phone && !sock.authState.creds.registered) {
          console.log(`\n📱 Demande de code de jumelage pour: ${phone}`);

          setTimeout(async () => {
            if (pairingCodeSent || isResolved) return;

            try {
              const cleanPhone = cleanPhoneNumber(phone);
              console.log(`📞 Requête pairing code pour: ${cleanPhone}`);

              const code = await sock!.requestPairingCode(cleanPhone);
              pairingCodeSent = true;

              // Formater le code avec des tirets pour meilleure lisibilité
              const formattedCode = code.match(/.{1,4}/g)?.join("-") || code;
              console.log(`\n🟢 ========================================`);
              console.log(`   CODE DE LIAISON GÉNÉRÉ !`);
              console.log(`========================================`);
              console.log(`📱 Pour: ${cleanPhone}`);
              console.log(`🔢 Code: ${formattedCode}`);
              console.log(`\n📱 Allez sur WhatsApp > Appareils connectés > Lier avec le numéro de téléphone.`);
              console.log(`⏱️  Le code expire dans quelques minutes.\n`);

              resolveOnce(NextResponse.json({
                success: true,
                type: "phone",
                code: code // Code brut (sans tirets)
              }));
            } catch (err: any) {
              console.error("❌ Erreur génération code:", err);
              resolveOnce(NextResponse.json(
                { error: `Erreur lors de la génération du code: ${err.message}` },
                { status: 500 }
              ));
            }
          }, PAIRING_CODE_DELAY);
        }

        // Gestion des mises à jour de connexion
        sock.ev.on("connection.update", async (update) => {
          const { connection, lastDisconnect, qr } = update;

          console.log(`🔄 Connection update - Status: ${connection}, QR: ${!!qr}`);

          // Gestion du QR Code
          if (qr && method === "qr" && !qrCodeReceived && !isResolved) {
            qrCodeReceived = true;
            console.log("\n📷 QR Code reçu - Génération de l'image...");

            try {
              const qrImage = await generateQRCodeImage(qr);
              console.log("✅ QR Code généré avec succès");
              // RETOURNER LE QR CODE AU FRONTEND IMMÉDIATEMENT
              resolveOnce(NextResponse.json({
                success: true,
                type: "qr",
                qr: qrImage
              }));
            } catch (error: any) {
              console.error("❌ Erreur génération image QR:", error);
              resolveOnce(NextResponse.json(
                { error: "Erreur lors de la génération du QR code" },
                { status: 500 }
              ));
            }
          }

          // Connexion établie
          if (connection === "open") {
            console.log("\n✅ ========================================");
            console.log("   BOT CONNECTÉ AVEC SUCCÈS !");
            console.log("========================================\n");

            const user = sock?.user;
            if (user) {
              console.log(`📱 Numéro : ${user.id.split(':')[0]}`);
              console.log(`👤 Nom : ${user.name || 'Non défini'}\n`);
            }

            if (!isResolved) {
              resolveOnce(NextResponse.json({
                success: true,
                message: "Connecté à WhatsApp avec succès !",
                type: method
              }));
            }
          }

          // Connexion fermée (GESTION IDENTIQUE À INDEX.JS)
          if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error instanceof Boom
              && (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;

            const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
            const reason = DisconnectReason[statusCode] || 'Unknown';

            console.log("\n⚠️ Connexion fermée.");

            switch (statusCode) {
              case DisconnectReason.badSession:
                console.log("❌ Session invalide. Supprimez le dossier 'auth_info_baileys' et reconnectez-vous.");
                deleteAuthFolder();
                break;
              case DisconnectReason.connectionClosed:
                console.log("🔌 Connexion fermée par le serveur.");
                break;
              case DisconnectReason.connectionLost:
                console.log("📡 Connexion perdue.");
                break;
              case DisconnectReason.connectionReplaced:
                console.log("🔄 Connexion remplacée (appareil connecté ailleurs).");
                deleteAuthFolder();
                break;
              case DisconnectReason.loggedOut:
                console.log("🚪 Déconnecté. Supprimez 'auth_info_baileys' pour recommencer.");
                deleteAuthFolder();
                break;
              case DisconnectReason.restartRequired:
                console.log("♻️  Redémarrage nécessaire.");
                if (!isResolved) {
                  // Attendre un peu pour voir si Baileys se reconnecte
                  setTimeout(() => {
                    if (!isResolved) {
                      console.log("❌ Échec de la reconnexion automatique");
                      resolveOnce(NextResponse.json(
                        { error: "Redémarrage requis. Veuillez réessayer en scannant à nouveau le QR code." },
                        { status: 500 }
                      ));
                    }
                  }, 10000); // Attendre 10 secondes
                }
                break;
              case DisconnectReason.timedOut:
                console.log("⏱️  Timeout de connexion.");
                break;
              default:
                console.log(`Raison: ${reason} (${statusCode})`);
            }

            if (shouldReconnect) {
              console.log("🔄 Tentative de reconnexion dans 5 secondes...\n");
              // La reconnexion sera gérée automatiquement par Baileys
            } else {
              console.log("🛑 Connexion terminée.\n");
            }

            // Si pas encore résolu, renvoyer une erreur
            if (!isResolved) {
              let errorMessage = "Connexion fermée par WhatsApp";

              switch (statusCode) {
                case DisconnectReason.badSession:
                  errorMessage = "Session invalide. Veuillez réessayer.";
                  break;
                case DisconnectReason.connectionClosed:
                  errorMessage = "Connexion interrompue. Veuillez réessayer.";
                  break;
                case DisconnectReason.connectionLost:
                  errorMessage = "Connexion perdue. Vérifiez votre connexion internet.";
                  break;
                case DisconnectReason.connectionReplaced:
                  errorMessage = "Connexion remplacée par une autre session.";
                  break;
                case DisconnectReason.loggedOut:
                  errorMessage = "Vous avez été déconnecté de WhatsApp.";
                  break;
                case DisconnectReason.restartRequired:
                  errorMessage = "Redémarrage requis. Veuillez réessayer.";
                  break;
                case DisconnectReason.timedOut:
                  errorMessage = "Délai d'attente dépassé. Vérifiez votre connexion.";
                  break;
              }

              resolveOnce(NextResponse.json(
                { error: errorMessage },
                { status: 500 }
              ));
            }
          }

          // Connexion en cours
          if (connection === "connecting") {
            console.log("🔄 Connexion à WhatsApp en cours...");
          }
        });

        // Gestion des messages (optionnel - pour debug)
        sock.ev.on("messages.upsert", ({ messages }) => {
          console.log(`📨 ${messages.length} nouveau(x) message(s) reçu(s)`);
        });

      } catch (error: any) {
        console.error("❌ Erreur création socket:", error);
        resolveOnce(NextResponse.json(
          { error: `Erreur de connexion: ${error.message}` },
          { status: 500 }
        ));
      }
    });

  } catch (error: any) {
    console.error("❌ Erreur API Auth WhatsApp:", error);

    // Nettoyage en cas d'erreur
    if (timeoutId) clearTimeout(timeoutId);
    if (sock) {
      try {
        (sock as any).end(undefined);
      } catch (e) {
        console.error("Erreur fermeture socket:", e);
      }
    }
    deleteAuthFolder();

    return NextResponse.json(
      { error: error.message || "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// ============================================================================
// MÉTHODES OPTIONNELLES
// ============================================================================

/**
 * GET - Vérifier le statut de la connexion
 */
export async function GET() {
  const authFolder = path.join(process.cwd(), "auth_info_baileys");
  const sessionExists = hasExistingSession(authFolder);

  return NextResponse.json({
    connected: sessionExists,
    message: sessionExists
      ? "Une session WhatsApp existe"
      : "Aucune session WhatsApp active"
  });
}

/**
 * DELETE - Déconnecter et nettoyer la session
 */
export async function DELETE() {
  try {
    const authFolder = path.join(process.cwd(), "auth_info_baileys");

    if (hasExistingSession(authFolder)) {
      deleteAuthFolder();
      console.log("🧹 Session WhatsApp supprimée");
      return NextResponse.json({
        success: true,
        message: "Session WhatsApp déconnectée avec succès"
      });
    }

    return NextResponse.json({
      success: true,
      message: "Aucune session à supprimer"
    });
  } catch (error: any) {
    console.error("❌ Erreur suppression session:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// GESTION DES ERREURS GLOBALES (POUR BAD MAC)
// ============================================================================

// Gestion des erreurs non capturées
process.on('uncaughtException', (err) => {
  // Ignorer les erreurs Bad MAC
  if (err instanceof Error && err.message.includes('Bad MAC')) {
    return;
  }
  console.error('❌ Erreur non capturée :', err);
});

process.on('unhandledRejection', (err) => {
  // Ignorer les erreurs Bad MAC
  if (err instanceof Error && err.message.includes('Bad MAC')) {
    return;
  }
  console.error('❌ Promesse rejetée :', err);
});
