const { Module } = require("../main");
const { 
  humanSleep, 
  safeCall,
  simulateHumanTyping, 
  randomizeMessage,
  safeSendMessage 
} = require("./utils/antiban");

// Map pour stocker les sessions interactives de diffusion. Clé = JID de l'expéditeur
const diffuseSessions = new Map();

/**
 * Diffusion EN PRIVÉ (DMs) vers les membres des groupes avec BOUCLIER ANTI-BAN MAX & ANTI-RAFALE 428
 */
async function diffuseMessage(message, msgToDiffuse, selectedGroupJids) {
  let statusMsg;
  try {
    statusMsg = await message.sendReply(`_⏳ Extraction sécurisée des participants depuis ${selectedGroupJids.length} groupe(s) (anti-rafale actif)..._`);
    
    let targetMembers = new Set();
    let totalAdminsSkipped = 0;

    for (let i = 0; i < selectedGroupJids.length; i++) {
      const groupJid = selectedGroupJids[i];
      try {
        // Interrogation sécurisée avec gestion de reconnexion auto si code 428
        const groupMetadata = await safeCall(() => message.client.groupMetadata(groupJid));
        const participants = groupMetadata?.participants || [];
        
        for (let participant of participants) {
          // Ignorer les administrateurs et superadministrateurs
          if (participant.admin === "admin" || participant.admin === "superadmin") {
            totalAdminsSkipped++;
            continue;
          }
          // Éviter d'envoyer au bot lui-même ou au propriétaire
          if (participant.id !== message.client.user?.jid && participant.id !== message.sender) {
            targetMembers.add(participant.id);
          }
        }
      } catch (err) {
        console.error(`Erreur récupération métadonnées groupe ${groupJid}:`, err?.message || err);
      }

      // 🛑 PAUSE ANTI-RAFALE ENTRE CHAQUE GROUPE (Empêche l'erreur WhatsApp 428 Precondition Required)
      if (i < selectedGroupJids.length - 1) {
        await humanSleep(2500, 4500);
      }
    }

    const targetsArray = Array.from(targetMembers);
    const total = targetsArray.length;

    if (total === 0) {
      return await message.edit(`_⚠️ Aucun membre cible trouvé pour la diffusion._`, message.jid, statusMsg.key);
    }

    const estimatedSec = Math.ceil(total * 28.5);
    const estTimeStr = estimatedSec > 3600 
        ? `${Math.floor(estimatedSec / 3600)}h ${Math.floor((estimatedSec % 3600) / 60)}m` 
        : `${Math.floor(estimatedSec / 60)}m ${estimatedSec % 60}s`;

    await message.edit(
      `_🚀 Début de la diffusion en privé à ${total} membre(s)..._\n` +
      `_⏱️ Temps estimé : *${estTimeStr}*_\n` +
      `_🛡️ Bouclier Anti-Ban & Anti-428 activé :_\n` +
      `• *Anti-Rafale* : Rythme modéré & reconnexion auto\n` +
      `• *Spintax & Hash unique* par message\n` +
      `• *Simulation de frappe* & *Pauses automatiques*`,
      message.jid, 
      statusMsg.key
    );

    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < total; i++) {
      const targetJid = targetsArray[i];

      // 1. Pause de refroidissement tous les 10 messages pour bloquer la détection heuristique WhatsApp
      if (i > 0 && i % 10 === 0) {
        const pauseSec = Math.floor(Math.random() * (75 - 45 + 1)) + 45; // Pause aléatoire entre 45 et 75 sec
        await message.edit(
          `_☕ [Anti-Ban] Pause de sécurité automatique de ${pauseSec}s après 10 messages pour réguler la connexion WhatsApp (${i}/${total})..._`,
          message.jid,
          statusMsg.key
        );
        await humanSleep(pauseSec * 1000, pauseSec * 1000 + 1000);
        await message.edit(
          `_🚀 Reprise de la diffusion : ${Math.floor((i / total) * 100)}% (${i}/${total})_`,
          message.jid,
          statusMsg.key
        );
      }

      try {
        // 2 & 3. Simulation, Obfuscation et Envoi résilient via safeSendMessage
        // En cas de déconnexion temporaire 428, safeSendMessage attend et réessaye au lieu de crasher !
        await safeSendMessage(message.client, targetJid, msgToDiffuse);
        sentCount++;
      } catch (error) {
        console.error(`Échec envoi vers ${targetJid}:`, error?.message || error);
        failedCount++;
      }

      // Mise à jour du statut tous les 5 messages ou à la fin
      if (sentCount % 5 === 0 || i === total - 1) {
        const percent = Math.floor(((i + 1) / total) * 100);
        await message.edit(
          `_🔄 Diffusion en cours : ${percent}% (${i + 1}/${total})_\n_✅ Réussis : ${sentCount} | ❌ Échoués : ${failedCount}_`,
          message.jid, 
          statusMsg.key
        );
      }

      // 4. Délai inter-message réaliste entre 12 et 24 secondes
      if (i < total - 1 && (i + 1) % 10 !== 0) {
        await humanSleep(12000, 24000);
      }
    }

    await message.edit(
      `_✅ Diffusion en privé terminée avec succès !_\n\n` +
      `📊 *Bilan final :*\n` +
      `• Messages livrés : *${sentCount}*\n` +
      `• Échecs d'envoi : *${failedCount}*\n` +
      `• Admins ignorés : *${totalAdminsSkipped}*\n` +
      `_🛡️ Protection Anti-Ban accomplie._`,
      message.jid, 
      statusMsg.key
    );
    
  } catch (e) {
    console.error("Erreur globale diffuse:", e);
    if (statusMsg) {
      await message.edit("_❌ Une erreur est survenue lors de la diffusion._", message.jid, statusMsg.key);
    } else {
      await message.sendReply("_❌ Une erreur est survenue._");
    }
  }
}

/**
 * Diffusion DIRECTEMENT DANS LES GROUPES (Mode Zéro Risque / Recommandé)
 */
async function diffuseGroupMessage(message, msgToDiffuse, selectedGroupJids) {
  let statusMsg = await message.sendReply(`_⏳ Préparation de la diffusion dans ${selectedGroupJids.length} groupe(s)..._`);
  let sentCount = 0;
  let failedCount = 0;

  const estimatedSec = Math.ceil(selectedGroupJids.length * 16.5);
  const estTimeStr = estimatedSec > 3600 
      ? `${Math.floor(estimatedSec / 3600)}h ${Math.floor((estimatedSec % 3600) / 60)}m` 
      : `${Math.floor(estimatedSec / 60)}m ${estimatedSec % 60}s`;

  await message.edit(
    `_📢 Début de la diffusion directe dans ${selectedGroupJids.length} groupe(s)...\n(Mode le plus sécurisé contre le signalement d'utilisateurs)_\n` +
    `_⏱️ Temps estimé : *${estTimeStr}*_`,
    message.jid,
    statusMsg.key
  );

  for (let i = 0; i < selectedGroupJids.length; i++) {
    const groupJid = selectedGroupJids[i];
    try {
      await safeSendMessage(message.client, groupJid, msgToDiffuse);
      sentCount++;
    } catch (e) {
      failedCount++;
    }

    // Délai de 8 à 16 secondes entre chaque groupe
    if (i < selectedGroupJids.length - 1) {
      await humanSleep(8000, 16000);
    }
  }

  await message.edit(
    `_✅ Diffusion dans les groupes terminée !_\n• Groupes atteints : *${sentCount}*\n• Échecs : *${failedCount}*`,
    message.jid,
    statusMsg.key
  );
}

// Commande .diffuse (Envoi en privé aux membres)
Module(
  {
    pattern: "diffuse ?(.*)",
    desc: "Diffuse un message EN PRIVÉ à tous les membres des groupes avec bouclier Anti-Ban MAX.",
    use: "owner",
    fromMe: true
  },
  async (message, match) => {
    const arg = match[1]?.trim();

    if (arg && arg.includes("|")) {
      const parts = arg.split("|");
      const msgToDiffuse = parts[0].trim();
      const groupTarget = parts[1].trim().toLowerCase();
      
      if (!msgToDiffuse || !groupTarget) {
        return await message.sendReply("_❌ Syntaxe : .diffuse {Salut|Bonjour} message | all_");
      }

      const groupsObj = await safeCall(() => message.client.groupFetchAllParticipating());
      const allGroups = Object.values(groupsObj || {});
      let selectedGroupJids = [];
      
      if (groupTarget === "all") {
        selectedGroupJids = allGroups.map(g => g.id);
      } else {
        const targetNames = groupTarget.split(",").map(n => n.trim().toLowerCase());
        selectedGroupJids = allGroups
          .filter(g => targetNames.includes(g.subject.toLowerCase()))
          .map(g => g.id);
      }

      if (selectedGroupJids.length === 0) {
        return await message.sendReply("_❌ Aucun groupe correspondant trouvé._");
      }

      return diffuseMessage(message, msgToDiffuse, selectedGroupJids);
    }

    diffuseSessions.set(message.sender, { step: 1, type: "private", message: null, groups: null });
    await message.sendReply(
      `_🛡️ *Mode Diffusion en Privé (Anti-Ban & Anti-428)*_\n\n` +
      `Veuillez répondre à ce message avec le texte à diffuser.\n\n` +
      `💡 *Conseil Anti-Ban :* Utilisez du Spintax pour que chaque membre reçoive une phrase unique, par exemple :\n` +
      `\`{Bonjour|Salut|Coucou}, je vous écris pour {vous informer|vous présenter}...\``
    );
  }
);

// Commande .diffuseg (Envoi directement DANS les groupes)
Module(
  {
    pattern: "diffuseg ?(.*)",
    desc: "Diffuse un message DIRECTEMENT dans les groupes (100% sécurisé sans risque de ban).",
    use: "owner",
    fromMe: true
  },
  async (message, match) => {
    const arg = match[1]?.trim();

    if (arg && arg.includes("|")) {
      const parts = arg.split("|");
      const msgToDiffuse = parts[0].trim();
      const groupTarget = parts[1].trim().toLowerCase();

      const groupsObj = await safeCall(() => message.client.groupFetchAllParticipating());
      const allGroups = Object.values(groupsObj || {});
      let selectedGroupJids = [];
      
      if (groupTarget === "all") {
        selectedGroupJids = allGroups.map(g => g.id);
      } else {
        const targetNames = groupTarget.split(",").map(n => n.trim().toLowerCase());
        selectedGroupJids = allGroups
          .filter(g => targetNames.includes(g.subject.toLowerCase()))
          .map(g => g.id);
      }

      if (selectedGroupJids.length === 0) {
        return await message.sendReply("_❌ Aucun groupe correspondant trouvé._");
      }

      return diffuseGroupMessage(message, msgToDiffuse, selectedGroupJids);
    }

    diffuseSessions.set(message.sender, { step: 1, type: "group", message: null, groups: null });
    await message.sendReply(
      `_📢 *Mode Diffusion dans les Groupes (Zéro Risque Spam)*_\n\n` +
      `Veuillez répondre à ce message avec le texte à diffuser dans vos groupes.`
    );
  }
);

// Gestionnaire d'étapes interactives pour les réponses
Module(
  {
    on: "text",
    fromMe: true
  },
  async (message) => {
    if (!message.reply_message) return;
    
    const session = diffuseSessions.get(message.sender);
    if (!session) return;

    const repliedText = message.reply_message.text || "";

    // Étape 1 : Enregistrement du message et sélection des groupes
    if (session.step === 1 && (repliedText.includes("Mode Diffusion en Privé") || repliedText.includes("Mode Diffusion dans les Groupes") || repliedText.includes("Veuillez répondre à ce message avec le texte"))) {
      const msgToDiffuse = message.text;
      
      if (!msgToDiffuse) {
        return await message.sendReply("_❌ Veuillez fournir un message texte valide._");
      }

      const groupsObj = await safeCall(() => message.client.groupFetchAllParticipating());
      const allGroups = Object.values(groupsObj || {});
      
      if (allGroups.length === 0) {
        diffuseSessions.delete(message.sender);
        return await message.sendReply("_❌ Vous n'êtes dans aucun groupe._");
      }

      let groupListText = "_Voici la liste de vos groupes :_\n\n";
      allGroups.forEach((g, index) => {
        groupListText += `*${index + 1}.* ${g.subject}\n`;
      });
      groupListText += "\n_Répondez à ce message avec les numéros des groupes séparés par une virgule (ex: 1,3), ou répondez *all* pour tous les groupes._";

      diffuseSessions.set(message.sender, { 
        step: 2, 
        type: session.type || "private",
        message: msgToDiffuse, 
        groups: allGroups 
      });

      return await message.sendReply(groupListText);
    }

    // Étape 2 : Confirmation et Lancement
    if (session.step === 2 && repliedText.includes("Voici la liste de vos groupes")) {
      const answer = message.text.trim().toLowerCase();
      const allGroups = session.groups;
      const msgToDiffuse = session.message;
      const diffType = session.type;
      let selectedGroupJids = [];

      if (answer === "all") {
        selectedGroupJids = allGroups.map(g => g.id);
      } else {
        const numbers = answer.split(",").map(n => parseInt(n.trim()));
        for (let num of numbers) {
          if (num > 0 && num <= allGroups.length) {
            selectedGroupJids.push(allGroups[num - 1].id);
          }
        }
      }

      diffuseSessions.delete(message.sender); // Nettoyer la session

      if (selectedGroupJids.length === 0) {
        return await message.sendReply("_❌ Sélection invalide. Opération annulée._");
      }

      if (diffType === "group") {
        return diffuseGroupMessage(message, msgToDiffuse, selectedGroupJids);
      } else {
        return diffuseMessage(message, msgToDiffuse, selectedGroupJids);
      }
    }
  }
);
