const { Module } = require("../main");
const { 
  humanSleep, 
  safeCall,
  simulateHumanTyping, 
  randomizeMessage,
  safeSendMessage 
} = require("./utils/antiban");
const config = require("../config");

// Map pour stocker les sessions interactives de diffusion. Clé = sessionId ou JID de l'expéditeur
const diffuseSessions = new Map();

// Registre des diffusions actives isolées par SESSION_ID
// Clé = sessionId -> { isRunning, isPaused, mode, targets, sentCount, failedCount, total, message, senderJid, statusText, startedAt, updatedAt }
const broadcastSessions = new Map();

function getBroadcastState(sessionId) {
  if (!sessionId) return null;
  const cleanId = String(sessionId).replace(/^RGNK~/, '').trim();
  return broadcastSessions.get(cleanId) || broadcastSessions.get(sessionId) || {
    status: 'idle',
    isRunning: false,
    isPaused: false,
    total: 0,
    sentCount: 0,
    failedCount: 0,
    progress: 0,
    mode: 'normal',
    statusText: 'Aucune diffusion en cours'
  };
}

function normalizeId(sessionId) {
  if (!sessionId) return "";
  return String(sessionId).replace(/^RGNK~/, '').trim();
}

async function startBroadcastSession(client, sessionId, { message: textMessage, targets = [], mode = "business", senderJid }) {
  const normId = normalizeId(sessionId);
  if (!targets || targets.length === 0) {
    throw new Error("Aucun destinataire cible fourni.");
  }
  if (!textMessage || !textMessage.trim()) {
    throw new Error("Le message de diffusion ne peut pas être vide.");
  }

  // Si déjà en cours, arrêter la précédente
  if (broadcastSessions.has(normId)) {
    const existing = broadcastSessions.get(normId);
    if (existing.isRunning) {
      existing.isRunning = false;
      existing.status = 'stopped';
    }
  }

  const broadcastState = {
    sessionId: normId,
    status: 'running',
    isRunning: true,
    isPaused: false,
    mode, // 'business' | 'normal' | 'fast'
    message: textMessage,
    targets: [...targets],
    remainingTargets: [...targets],
    total: targets.length,
    sentCount: 0,
    failedCount: 0,
    progress: 0,
    senderJid: senderJid || (client.user?.id ? client.user.id.split(':')[0] + '@s.whatsapp.net' : null),
    statusText: `Diffusion démarrée vers ${targets.length} destinataire(s)...`,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  broadcastSessions.set(normId, broadcastState);

  // Lancement asynchrone sans bloquer la requête
  runBroadcastLoop(client, broadcastState).catch(err => {
    console.error(`[Broadcast ${normId}] Erreur:`, err);
    broadcastState.status = 'error';
    broadcastState.statusText = `Erreur: ${err.message}`;
    broadcastState.isRunning = false;
  });

  return broadcastState;
}

async function runBroadcastLoop(client, state) {
  const isBusiness = state.mode === "business";
  const isFast = state.mode === "fast";
  let countSinceLastBreak = 0;
  const breakInterval = Math.floor(Math.random() * (20 - 15 + 1)) + 15; // Pause tous les 15 à 20 messages

  while (state.isRunning && state.remainingTargets.length > 0) {
    // 1. Gestion de la pause manuelle
    while (state.isPaused && state.isRunning) {
      state.status = 'paused';
      state.statusText = `Diffusion en pause (${state.sentCount}/${state.total} envoyés). En attente de reprise...`;
      await humanSleep(2000, 3000);
    }

    if (!state.isRunning) break;

    // 2. Gestion de la pause Business de 15 minutes
    if (isBusiness && countSinceLastBreak >= breakInterval) {
      state.status = 'paused_auto_antiban';
      const breakMs = (15 * 60 * 1000) + Math.floor(Math.random() * 60000); // 15 à 16 minutes
      const resumeTime = new Date(Date.now() + breakMs);
      
      const notifySelf = state.senderJid;
      if (notifySelf) {
        try {
          await client.sendMessage(notifySelf, {
            text: `_🛡️ [MYZAPP ANTI-BAN]* : Pause de sécurité de 15 minutes enclenchée (${state.sentCount}/${state.total} envoyés). Reprise automatique à ${resumeTime.toLocaleTimeString('fr-FR')}._`
          });
        } catch(e) {}
      }

      const stepInterval = 10000;
      let waited = 0;
      while (waited < breakMs && state.isRunning && !state.isPaused) {
        const remainingSec = Math.round((breakMs - waited) / 1000);
        state.statusText = `🛡️ Pause Anti-Ban active (reprise dans ${Math.ceil(remainingSec / 60)} min...)`;
        await humanSleep(stepInterval, stepInterval);
        waited += stepInterval;
      }

      countSinceLastBreak = 0;
    }

    if (!state.isRunning) break;

    // 3. Envoi du prochain message
    const targetJid = state.remainingTargets.shift();
    if (!targetJid) break;

    try {
      state.status = 'running';
      state.statusText = `Envoi en cours à ${targetJid.split('@')[0]} (${state.sentCount + 1}/${state.total})...`;
      
      // Randomisation et délai anti-ban
      const randomized = randomizeMessage(state.message);
      await safeSendMessage(client, targetJid, randomized, { skipTyping: isFast });
      
      state.sentCount++;
      countSinceLastBreak++;
    } catch (err) {
      console.warn(`[Broadcast] Échec vers ${targetJid}:`, err?.message || err);
      state.failedCount++;
    }

    state.progress = Math.round(((state.sentCount + state.failedCount) / state.total) * 100);
    state.updatedAt = new Date().toISOString();

    // Délai entre messages selon le mode
    if (!isFast) {
      const minSleep = isBusiness ? 8000 : 4000;
      const maxSleep = isBusiness ? 18000 : 10000;
      await humanSleep(minSleep, maxSleep);
    } else {
      await humanSleep(1000, 2500);
    }
  }

  if (state.isRunning) {
    state.status = 'completed';
    state.isRunning = false;
    state.progress = 100;
    state.statusText = `✅ Diffusion terminée avec succès ! (${state.sentCount} envoyés, ${state.failedCount} échecs)`;
    
    // Notification de fin à soi-même
    if (state.senderJid) {
      try {
        await client.sendMessage(state.senderJid, {
          text: `_🎉 [MYZAPP] Diffusion terminée avec succès !_\n\n• 📊 *Total cibles :* ${state.total}\n• ✅ *Messages envoyés :* ${state.sentCount}\n• ❌ *Échecs :* ${state.failedCount}\n• 🛡️ *Mode utilisé :* ${state.mode}`
        });
      } catch(e) {}
    }
  } else {
    state.status = 'stopped';
    state.statusText = `⛔ Diffusion interrompue (${state.sentCount}/${state.total} envoyés).`;
  }
}

function pauseBroadcastSession(sessionId) {
  const normId = normalizeId(sessionId);
  const state = broadcastSessions.get(normId);
  if (!state || !state.isRunning) {
    return { success: false, message: "Aucune diffusion active à mettre en pause." };
  }
  state.isPaused = true;
  state.status = 'paused';
  state.statusText = 'Diffusion mise en pause manuellement';
  return { success: true, message: "Diffusion mise en pause.", state };
}

function resumeBroadcastSession(sessionId) {
  const normId = normalizeId(sessionId);
  const state = broadcastSessions.get(normId);
  if (!state || !state.isRunning) {
    return { success: false, message: "Aucune diffusion active à reprendre." };
  }
  state.isPaused = false;
  state.status = 'running';
  state.statusText = 'Reprise de la diffusion...';
  return { success: true, message: "Diffusion reprise avec succès.", state };
}

function stopBroadcastSession(sessionId) {
  const normId = normalizeId(sessionId);
  const state = broadcastSessions.get(normId);
  if (!state) {
    return { success: true, message: "Aucune diffusion en cours." };
  }
  state.isRunning = false;
  state.isPaused = false;
  state.status = 'stopped';
  state.remainingTargets = [];
  state.statusText = 'Diffusion arrêtée par l\'utilisateur.';
  return { success: true, message: "Diffusion arrêtée avec succès.", state };
}

// ----------------------------------------------------------------------------------
// COMMANDES WHATSAPP IN-CHAT (Conservées et améliorées)
// ----------------------------------------------------------------------------------

Module(
  {
    pattern: "diffuse ?(.*)",
    fromMe: true,
    desc: "Menu interactif de diffusion",
    use: "utility",
  },
  async (message, match) => {
    const rawArg = match[1] ? match[1].trim() : "";
    const sessionId = message.client?.user?.id || "default";

    if (rawArg.toLowerCase() === "stop" || rawArg.toLowerCase() === "arreter") {
      stopBroadcastSession(sessionId);
      return await message.sendReply("_⛔ Diffusion arrêtée avec succès._");
    }

    if (rawArg.toLowerCase() === "pause") {
      pauseBroadcastSession(sessionId);
      return await message.sendReply("_⏸️ Diffusion mise en pause._");
    }

    if (rawArg.toLowerCase() === "resume" || rawArg.toLowerCase() === "reprendre") {
      resumeBroadcastSession(sessionId);
      return await message.sendReply("_▶️ Reprise de la diffusion._");
    }

    if (rawArg.toLowerCase() === "status") {
      const state = getBroadcastState(sessionId);
      return await message.sendReply(
        `*📊 STATUT DIFFUSION MYZAPP*\n\n` +
        `• *État :* ${state.statusText}\n` +
        `• *Progression :* ${state.progress || 0}%\n` +
        `• *Livrés :* ${state.sentCount || 0} / ${state.total || 0}\n` +
        `• *Échecs :* ${state.failedCount || 0}`
      );
    }

    await message.sendReply(
      `*⚡ STUDIO DIFFUSION MYZAPP*\n\n` +
      `💡 _Vous pouvez piloter vos diffusions avec précision depuis votre Dashboard MyZapp :_\n` +
      `👉 *https://myzapp-app.vercel.app/app*\n\n` +
      `*Commandes rapides WhatsApp :*\n` +
      `• *.diffuse status* - Voir l'état de la diffusion\n` +
      `• *.diffuse pause* - Mettre en pause\n` +
      `• *.diffuse resume* - Reprendre la diffusion\n` +
      `• *.diffuse stop* - Arrêter définitivement`
    );
  }
);

module.exports = {
  startBroadcastSession,
  pauseBroadcastSession,
  resumeBroadcastSession,
  stopBroadcastSession,
  getBroadcastState
};
