/**
 * Module Anti-Ban & Humanisation pour WhatsApp / Baileys
 * Protège le compte contre les détections algorithmiques de Spam (Hashing, Rate-limiting, Heuristiques)
 */

// Générer un délai aléatoire réaliste
const humanSleep = (minMs, maxMs) => {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Simulation de la saisie humaine ("en train d'écrire...")
async function simulateHumanTyping(client, jid, text = "") {
  try {
    if (!client || !jid) return;
    
    // Annoncer sa présence
    await client.sendPresenceUpdate("available", jid);
    await humanSleep(300, 700);

    // Activer l'indicateur "en train d'écrire..." (composing)
    await client.sendPresenceUpdate("composing", jid);

    // Calculer un temps de frappe proportionnel à la longueur du message (~40ms par caractère)
    const length = typeof text === "string" ? text.length : 30;
    const typingTime = Math.min(Math.max(length * 40, 2000), 7000); // Entre 2 et 7 secondes max
    await humanSleep(typingTime, typingTime + 500);

    // Arrêter l'indicateur de frappe
    await client.sendPresenceUpdate("paused", jid);
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

// Wrapper sécurisé d'envoi de message avec humanisation
async function safeSendMessage(client, jid, content, options = {}) {
  try {
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

    return await client.sendMessage(jid, content, options);
  } catch (error) {
    throw error;
  }
}

module.exports = {
  humanSleep,
  simulateHumanTyping,
  evaluateSpintax,
  injectInvisibleHash,
  randomizeMessage,
  safeSendMessage
};
