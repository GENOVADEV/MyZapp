const { Module } = require("../main");
const { 
  humanSleep, 
  safeCall,
  simulateHumanTyping, 
  randomizeMessage,
  safeSendMessage 
} = require("./utils/antiban");
const config = require("../config");
const { setVar } = require("./manage");

// Map pour stocker les sessions interactives de diffusion. Clé = JID de l'expéditeur
const diffuseSessions = new Map();

let isBusinessQueueRunning = false;
let diffuseGlobalClient = null;

async function getDailySentCount() {
  const today = new Date().toISOString().split("T")[0];
  let data = { date: today, count: 0 };
  if (config.WA_DAILY_SENT_COUNT) {
    try {
      const parsed = JSON.parse(config.WA_DAILY_SENT_COUNT);
      if (parsed.date === today) {
        data.count = parsed.count;
      }
    } catch(e) {}
  }
  return data;
}

async function incrementDailySentCount() {
  const data = await getDailySentCount();
  data.count++;
  await setVar("WA_DAILY_SENT_COUNT", JSON.stringify(data));
  config.WA_DAILY_SENT_COUNT = JSON.stringify(data);
  return data.count;
}

async function processBusinessQueue() {
  if (isBusinessQueueRunning || !diffuseGlobalClient) return;
  isBusinessQueueRunning = true;

  while (true) {
    let queue = [];
    if (config.DIFFUSE_QUEUE) {
       try { queue = JSON.parse(config.DIFFUSE_QUEUE); } catch(e) {}
    }
    
    if (queue.length === 0) {
      isBusinessQueueRunning = false;
      return;
    }

    const task = queue[0];
    
    const dailyData = await getDailySentCount();
    if (dailyData.count >= 1000) {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 1, 0);
      const timeToWait = tomorrow.getTime() - now.getTime();
      
      try {
         await diffuseGlobalClient.sendMessage(task.sender, { text: `_⚠️ Limite journalière de 1000 messages atteinte. La diffusion s'est mise en pause et reprendra automatiquement demain à 00h01._` });
      } catch(e) {}
      
      await humanSleep(timeToWait, timeToWait + 10000);
      continue;
    }

    const batchSize = Math.floor(Math.random() * (20 - 15 + 1)) + 15;
    const targetsToProcess = task.targets.slice(0, batchSize);
    
    let sentInBatch = 0;
    for (const targetJid of targetsToProcess) {
       const checkLimit = await getDailySentCount();
       if (checkLimit.count >= 1000) break;

       try {
         await safeSendMessage(diffuseGlobalClient, targetJid, task.message, { skipTyping: false });
         await incrementDailySentCount();
         task.sentCount = (task.sentCount || 0) + 1;
         sentInBatch++;
       } catch (err) {
         task.failedCount = (task.failedCount || 0) + 1;
       }
       await humanSleep(5000, 15000); 
    }
    
    task.targets = task.targets.slice(sentInBatch);
    
    if (task.targets.length === 0) {
       queue.shift();
       await setVar("DIFFUSE_QUEUE", JSON.stringify(queue));
       config.DIFFUSE_QUEUE = JSON.stringify(queue);
       
       try {
         await diffuseGlobalClient.sendMessage(task.sender, { text: `_✅ Diffusion Ultra-Sécurisée terminée !_\n• Livrés : ${task.sentCount}\n• Échecs : ${task.failedCount || 0}` });
       } catch(e) {}
    } else {
       queue[0] = task;
       await setVar("DIFFUSE_QUEUE", JSON.stringify(queue));
       config.DIFFUSE_QUEUE = JSON.stringify(queue);
       
       try {
         await diffuseGlobalClient.sendMessage(task.sender, { text: `_☕ Lot de ${sentInBatch} messages envoyé. Pause de sécurité de 15 à 20 minutes..._\n_Progression : ${task.sentCount} envoyés, ${task.targets.length} restants._` });
       } catch(e) {}
       
       const pauseMs = (Math.floor(Math.random() * (20 - 15 + 1)) + 15) * 60 * 1000;
       await humanSleep(pauseMs, pauseMs + 60000);
    }
  }
}

/**
 * Diffusion EN PRIVÉ (DMs) vers les membres des groupes avec BOUCLIER ANTI-BAN MAX & ANTI-RAFALE 428
 */
async function diffuseMessage(message, msgToDiffuse, selectedGroupJids, speedMode = 1) {
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

    let estimatedSec = 0;
    if (speedMode === 1) estimatedSec = Math.ceil(total * 28.5);
    else if (speedMode === 2) estimatedSec = Math.ceil(total * 6.5);
    else estimatedSec = 30; // Instantané = généralement moins d'une minute

    const estTimeStr = estimatedSec > 3600 
        ? `${Math.floor(estimatedSec / 3600)}h ${Math.floor((estimatedSec % 3600) / 60)}m` 
        : `${Math.floor(estimatedSec / 60)}m ${estimatedSec % 60}s`;

    let speedText = "Normal (Recommandé)";
    if (speedMode === 2) speedText = "Rapide";
    if (speedMode === 3) speedText = "Instantané (Risqué)";
    if (speedMode === 4) speedText = "Ultra-Sécurisé (Business)";

    if (speedMode === 4) {
      let queue = [];
      if (config.DIFFUSE_QUEUE) {
         try { queue = JSON.parse(config.DIFFUSE_QUEUE); } catch(e) {}
      }
      queue.push({
         sender: message.jid,
         message: msgToDiffuse,
         targets: targetsArray,
         sentCount: 0,
         failedCount: 0
      });
      await setVar("DIFFUSE_QUEUE", JSON.stringify(queue));
      config.DIFFUSE_QUEUE = JSON.stringify(queue);
      
      if (!diffuseGlobalClient) diffuseGlobalClient = message.client;
      
      await message.edit(
        `_🚀 Diffusion Ultra-Sécurisée ajoutée à la file d'attente._\n` +
        `_Le bot enverra des lots de 15-20 messages suivis de pauses de 15-20min._\n` +
        `_Vous recevrez des notifications de progression ici._`,
        message.jid, 
        statusMsg.key
      );
      
      processBusinessQueue();
      return;
    }

    await message.edit(
      `_🚀 Début de la diffusion en privé à ${total} membre(s)..._\n` +
      `_⚡ Vitesse : *${speedText}*_\n` +
      `_⏱️ Temps estimé : *${estTimeStr}*_\n` +
      `_🛡️ Bouclier Anti-Ban & Anti-428 activé :_\n` +
      `• *Anti-Rafale* : Reconnexion auto\n` +
      `• *Spintax & Hash unique* par message\n` +
      (speedMode < 3 ? `• *Simulation de frappe* & *Pauses automatiques*` : `• *Envoi groupé* (Simulation de frappe désactivée)`),
      message.jid, 
      statusMsg.key
    );

    let sentCount = 0;
    let failedCount = 0;

    if (speedMode === 3) {
      // 🚨 MODE INSTANTANÉ : Envois en parallèle par lots
      const batchSize = 15; // Envoi de 15 messages à la fois
      for (let i = 0; i < total; i += batchSize) {
        const batch = targetsArray.slice(i, i + batchSize);
        const promises = batch.map(targetJid => {
          return safeSendMessage(message.client, targetJid, msgToDiffuse, { skipTyping: true })
            .then(() => { sentCount++; })
            .catch(err => {
              console.error(`Échec envoi vers ${targetJid}:`, err?.message || err);
              failedCount++;
            });
        });
        
        await Promise.all(promises);
        
        const percent = Math.floor((Math.min(i + batchSize, total) / total) * 100);
        await message.edit(
          `_🔄 Diffusion en cours : ${percent}% (${Math.min(i + batchSize, total)}/${total})_\n_✅ Réussis : ${sentCount} | ❌ Échoués : ${failedCount}_`,
          message.jid, 
          statusMsg.key
        );
        
        // Très courte pause entre les lots pour ne pas exploser la mémoire du socket
        if (i + batchSize < total) await humanSleep(1000, 2000);
      }
    } else {
      // MODE NORMAL OU RAPIDE : Envois séquentiels
      for (let i = 0; i < total; i++) {
        const targetJid = targetsArray[i];
  
        // 1. Pause de refroidissement
        let pauseInterval = speedMode === 1 ? 10 : 20;
        if (i > 0 && i % pauseInterval === 0) {
          const pauseSec = speedMode === 1 
            ? Math.floor(Math.random() * (75 - 45 + 1)) + 45 // 45 à 75 sec pour Normal
            : Math.floor(Math.random() * (15 - 5 + 1)) + 5;  // 5 à 15 sec pour Rapide
            
          await message.edit(
            `_☕ [Anti-Ban] Pause de sécurité automatique de ${pauseSec}s après ${pauseInterval} messages..._`,
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
          const sendOptions = speedMode === 2 ? { skipTyping: true } : {};
          await safeSendMessage(message.client, targetJid, msgToDiffuse, sendOptions);
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
  
        // 4. Délai inter-message réaliste
        if (i < total - 1 && (i + 1) % pauseInterval !== 0) {
          if (speedMode === 1) await humanSleep(12000, 24000); // 12-24s
          else await humanSleep(2000, 5000); // 2-5s
        }
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

      // Par défaut, la commande inline .diffuse ... utilise la vitesse normale (1)
      return diffuseMessage(message, msgToDiffuse, selectedGroupJids, 1);
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
    if (!diffuseGlobalClient && message.client) {
        diffuseGlobalClient = message.client;
        processBusinessQueue();
    }

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
        diffuseSessions.delete(message.sender);
        return await message.sendReply("_❌ Sélection invalide. Opération annulée._");
      }

      if (diffType === "group") {
        diffuseSessions.delete(message.sender);
        return diffuseGroupMessage(message, msgToDiffuse, selectedGroupJids);
      } else {
        // C'est une diffusion privée -> Demander la vitesse
        diffuseSessions.set(message.sender, {
          step: 3,
          type: "private",
          message: msgToDiffuse,
          selectedGroupJids: selectedGroupJids
        });
        
        return await message.sendReply(
          `_⚡ *Choisissez la vitesse de diffusion* :_\n\n` +
          `*1* ➔ 🐢 Normal (Recommandé) : _100% Sécurisé, pauses régulières_\n` +
          `*2* ➔ 🐇 Rapide : _Très rapide, pauses courtes_\n` +
          `*3* ➔ 🚀 Instantané : _Envoi massif en < 1min sans pause._ ⚠️ *(Risque)*\n` +
          `*4* ➔ 💼 Ultra-Sécurisé (WhatsApp Business) : _Lots de 15-20 msgs, pauses de 15-20min, limite 1000/jour. Résiste aux redémarrages._\n\n` +
          `_Répondez avec le chiffre (1, 2, 3 ou 4)._`
        );
      }
    }

    // Étape 3 : Choix de la vitesse (Seulement pour diffusion privée)
    if (session.step === 3 && session.type === "private" && repliedText.includes("Choisissez la vitesse de diffusion")) {
      const answer = parseInt(message.text.trim());
      
      if (![1, 2, 3, 4].includes(answer)) {
        return await message.sendReply("_❌ Choix invalide. Veuillez répondre par 1, 2, 3 ou 4._");
      }

      diffuseSessions.delete(message.sender);
      
      return diffuseMessage(message, session.message, session.selectedGroupJids, answer);
    }
  }
);
