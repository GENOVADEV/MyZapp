/**
 * Module Anti-Ban & Humanisation pour WhatsApp / Baileys
 * Protège contre les détections algorithmiques de Spam (Hashing, Rate-limiting, Heuristiques)
 * Évite les erreurs 428 (Precondition Required) et gère les reconnexions en douceur.
 */

// Générer un délai aléatoire réaliste
const humanSleep = (minMs, maxMs) => {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Exécution résiliente d'appels Baileys (anti-crash 428 / Connection Closed)
async function safeCall(fn, retries = 3, retryDelayMs = 8000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const errorMsg = error?.message || error?.output?.payload?.message || String(error);
      const isConnectionIssue = errorMsg.includes("Connection Closed") || 
                                errorMsg.includes("Precondition Required") || 
                                error?.output?.statusCode === 428 || 
                                error?.output?.statusCode === 503 ||
                                error?.output?.statusCode === 408;

      if (isConnectionIssue && attempt < retries) {
        console.warn(`⚠️ [Anti-Burst / 428 Shield] Interruption temporaire WhatsApp détectée (${errorMsg}). Attente de ${retryDelayMs/1000}s pour reconnexion automatique avant ré-exécution (Essai ${attempt}/${retries})...`);
        await humanSleep(retryDelayMs, retryDelayMs + 2000);
      } else {
        if (attempt === retries) throw error;
        await humanSleep(retryDelayMs, retryDelayMs + 2000);
      }
    }
  }
}

// Simulation de la saisie humaine ("en train d'écrire...")
async function simulateHumanTyping(client, jid, text = "") {
  try {
    if (!client || !jid) return;
    
    // Annoncer sa présence de manière sécurisée
    await safeCall(() => client.sendPresenceUpdate("available", jid), 1, 2000);
    await humanSleep(400, 800);

    // Activer l'indicateur "en train d'écrire..." (composing)
    await safeCall(() => client.sendPresenceUpdate("composing", jid), 1, 2000);

    // Calculer un temps de frappe proportionnel à la longueur du message (~40ms par caractère)
    const length = typeof text === "string" ? text.length : 30;
    const typingTime = Math.min(Math.max(length * 40, 2000), 7000); // Entre 2 et 7 secondes max
    await humanSleep(typingTime, typingTime + 500);

    // Arrêter l'indicateur de frappe
    await safeCall(() => client.sendPresenceUpdate("paused", jid), 1, 2000);
    await humanSleep(200, 500);
  } catch (e) {
    // Ignorer silencieusement les erreurs de présence si la socket n'autorise pas
  }
}

// Moteur de Spintax : remplace les {A|B|C} par un choix aléatoire
function evaluateSpintax(text) {
  if (typeof text !== "string") return text;
  const spintaxRegex = /\{([^{}]+)\}/g;
  let currentText = text;
  
  // Boucle pour gérer les spintax imbriqués ou multiples
  while (spintaxRegex.test(currentText)) {
    currentText = currentText.replace(spintaxRegex, (match, choices) => {
      const options = choices.split("|");
      return options[Math.floor(Math.random() * options.length)].trim();
    });
  }
  return currentText;
}

// Obfuscation de Hash : Injecte des caractères invisibles (Zero-Width Spaces) pour rendre chaque message unique pour WhatsApp
function injectInvisibleHash(text) {
  if (typeof text !== "string") return text;
  
  const invisibleChars = ["\u200B", "\u200C", "\u200D", "\uFEFF"];
  // Nombre aléatoire de caractères invisibles entre 1 et 6
  const count = Math.floor(Math.random() * 6) + 1;
  let signature = "";
  for (let i = 0; i < count; i++) {
    signature += invisibleChars[Math.floor(Math.random() * invisibleChars.length)];
  }
  
  // Placer la signature invisible à la fin ou après un point
  return text + signature;
}

// Fonction combinée de modification anti-spam
function randomizeMessage(text) {
  let modified = evaluateSpintax(text);
  modified = injectInvisibleHash(modified);
  return modified;
}

// Wrapper sécurisé et résilient d'envoi de message avec humanisation et anti-burst
async function safeSendMessage(client, jid, content, options = {}) {
  let textToSimulate = "";
  if (typeof content === "string") {
    content = randomizeMessage(content);
    textToSimulate = content;
    content = { text: content };
  } else if (content && typeof content.text === "string") {
    content.text = randomizeMessage(content.text);
    textToSimulate = content.text;
  }

  // Simuler l'action humaine
  if (!options.skipTyping) {
    await simulateHumanTyping(client, jid, textToSimulate);
  }

  // Envoi avec mécanisme d'essai automatique si WhatsApp réclame une pause (Erreur 428 / Socket Closed)
  return await safeCall(() => client.sendMessage(jid, content, options), 3, 10000);
}

module.exports = {
  humanSleep,
  safeCall,
  simulateHumanTyping,
  evaluateSpintax,
  injectInvisibleHash,
  randomizeMessage,
  safeSendMessage
};
