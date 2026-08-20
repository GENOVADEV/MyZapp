const { Module } = require("../main");
const { humanSleep, safeCall } = require("./utils/antiban");
const twilio = require('twilio');

// Map pour stocker les sessions interactives de diffusion. Clé = JID de l'expéditeur
const diffuseSafeSessions = new Map();

/**
 * Diffusion via Twilio WhatsApp API
 */
async function diffuseSafeMessage(message, msgToDiffuse, selectedGroupJids, speedMode = 1) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER; // ex: whatsapp:+14155238886

  if (!accountSid || !authToken || !fromNumber) {
    return await message.sendReply("_❌ Configuration Twilio manquante dans le fichier config.env._\nAssurez-vous d'avoir défini TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN et TWILIO_WHATSAPP_NUMBER.");
  }

  let twilioClient;
  try {
    twilioClient = twilio(accountSid, authToken);
  } catch (err) {
    return await message.sendReply(`_❌ Erreur d'initialisation de Twilio : ${err.message}_`);
  }

  let statusMsg;
  try {
    statusMsg = await message.sendReply(`_⏳ Extraction sécurisée des participants depuis ${selectedGroupJids.length} groupe(s)..._`);
    
    let targetMembers = new Set();
    let totalAdminsSkipped = 0;

    for (let i = 0; i < selectedGroupJids.length; i++) {
      const groupJid = selectedGroupJids[i];
      try {
        const groupMetadata = await safeCall(() => message.client.groupMetadata(groupJid));
        const participants = groupMetadata?.participants || [];
        
        for (let participant of participants) {
          // Ignorer les administrateurs pour éviter le signalement interne
          if (participant.admin === "admin" || participant.admin === "superadmin") {
            totalAdminsSkipped++;
            continue;
          }
          if (participant.id !== message.client.user?.jid && participant.id !== message.sender) {
            targetMembers.add(participant.id);
          }
        }
      } catch (err) {
        console.error(`Erreur récupération métadonnées groupe ${groupJid}:`, err?.message || err);
      }
    }

    const targetsArray = Array.from(targetMembers);
    const total = targetsArray.length;

    if (total === 0) {
      return await message.edit(`_⚠️ Aucun membre cible trouvé pour la diffusion._`, message.jid, statusMsg.key);
    }

    let speedText = speedMode === 1 ? "Normale" : speedMode === 2 ? "Rapide" : "Instantanée (Twilio)";
    let pauseInterMessage = speedMode === 1 ? 500 : speedMode === 2 ? 100 : 10;

    await message.edit(
      `_🚀 Début de la diffusion via *Twilio Business API* à ${total} membre(s)..._\n` +
      `_⚡ Vitesse : *${speedText}*_\n` +
      `_🛡️ Risque de Ban : *0%* (Canal Officiel)_\n` +
      `_⚠️ Rappel : Twilio peut bloquer les messages si ce n'est pas un modèle (Template) et que la règle des 24h n'est pas respectée._`,
      message.jid, 
      statusMsg.key
    );

    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < total; i++) {
      const targetJid = targetsArray[i];
      const targetNumber = targetJid.split('@')[0]; // ex: 2376xxxx

      try {
        await twilioClient.messages.create({
          body: msgToDiffuse,
          from: fromNumber,
          to: `whatsapp:+${targetNumber}`
        });
        sentCount++;
      } catch (error) {
        console.error(`Échec Twilio vers +${targetNumber}:`, error?.message || error);
        failedCount++;
      }

      // Mise à jour du statut tous les 10 messages ou à la fin
      if (sentCount % 10 === 0 || i === total - 1) {
        const percent = Math.floor(((i + 1) / total) * 100);
        await message.edit(
          `_🔄 Diffusion Twilio en cours : ${percent}% (${i + 1}/${total})_\n_✅ Livrés API : ${sentCount} | ❌ Échoués : ${failedCount}_`,
          message.jid, 
          statusMsg.key
        );
      }

      await humanSleep(pauseInterMessage, pauseInterMessage * 2);
    }

    await message.edit(
      `_✅ Diffusion Twilio Business terminée avec succès !_\n\n` +
      `📊 *Bilan final :*\n` +
      `• Messages envoyés à l'API : *${sentCount}*\n` +
      `• Échecs API : *${failedCount}*\n` +
      `• Admins ignorés : *${totalAdminsSkipped}*\n` +
      `_💡 Note : Consultez la console Twilio pour vérifier les taux de livraison réels sur les téléphones._`,
      message.jid, 
      statusMsg.key
    );
    
  } catch (e) {
    console.error("Erreur globale diffusesafe:", e);
    if (statusMsg) {
      await message.edit("_❌ Une erreur est survenue lors de la diffusion via Twilio._", message.jid, statusMsg.key);
    } else {
      await message.sendReply("_❌ Une erreur est survenue._");
    }
  }
}

// Commande .diffusesafe (Envoi en privé via Twilio)
Module(
  {
    pattern: "diffusesafe ?(.*)",
    desc: "Diffuse un message EN PRIVÉ via l'API Twilio (Business) avec un risque de ban de 0%.",
    use: "owner",
    fromMe: true
  },
  async (message, match) => {
    diffuseSafeSessions.set(message.sender, { step: 1, message: null, groups: null });
    
    await message.sendReply(
      `_🏢 *Mode Diffusion Business (Twilio 100% Safe)*_\n\n` +
      `Ce mode utilise l'API officielle WhatsApp Business. Vous ne serez *jamais banni*, mais vous devez respecter les règles de Meta :\n\n` +
      `⚠️ *Règle des 24h & Modèles (Templates)* :\n` +
      `1. Si vous envoyez un message *libre* (ex: "Coucou !"), il ne sera délivré qu'aux membres qui vous ont écrit dans les dernières 24 heures.\n` +
      `2. Pour joindre *tout le monde*, vous devez impérativement utiliser un *Modèle approuvé* depuis votre tableau de bord Twilio.\n\n` +
      `*Exemple de Modèle approuvé* :\n` +
      `\`Votre commande {{1}} a été expédiée. Merci de votre confiance.\`\n\n` +
      `*Exemple d'envoi libre (Risque d'échec Twilio si pas de contact <24h)* :\n` +
      `\`Salut à tous les membres du groupe ! Lisez mon nouveau PDF.\`\n\n` +
      `_Veuillez répondre à ce message avec le texte (ou le modèle) à diffuser._`
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
    
    const session = diffuseSafeSessions.get(message.sender);
    if (!session) return;

    const repliedText = message.reply_message.text || "";

    // Étape 1 : Enregistrement du message et sélection des groupes
    if (session.step === 1 && repliedText.includes("Mode Diffusion Business (Twilio")) {
      const msgToDiffuse = message.text;
      
      if (!msgToDiffuse) {
        return await message.sendReply("_❌ Veuillez fournir un message texte valide._");
      }

      const groupsObj = await safeCall(() => message.client.groupFetchAllParticipating());
      const allGroups = Object.values(groupsObj || {});
      
      if (allGroups.length === 0) {
        diffuseSafeSessions.delete(message.sender);
        return await message.sendReply("_❌ Vous n'êtes dans aucun groupe._");
      }

      let groupListText = "_Voici la liste de vos groupes pour la diffusion Twilio :_\n\n";
      allGroups.forEach((g, index) => {
        groupListText += `*${index + 1}.* ${g.subject}\n`;
      });
      groupListText += "\n_Répondez à ce message avec les numéros des groupes séparés par une virgule (ex: 1,3), ou répondez *all* pour tous les groupes._";

      diffuseSafeSessions.set(message.sender, { 
        step: 2, 
        message: msgToDiffuse, 
        groups: allGroups 
      });

      return await message.sendReply(groupListText);
    }

    // Étape 2 : Confirmation et Choix de la vitesse
    if (session.step === 2 && repliedText.includes("liste de vos groupes pour la diffusion Twilio")) {
      const answer = message.text.trim().toLowerCase();
      const allGroups = session.groups;
      const msgToDiffuse = session.message;
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

      if (selectedGroupJids.length === 0) {
        diffuseSafeSessions.delete(message.sender);
        return await message.sendReply("_❌ Sélection invalide. Opération annulée._");
      }

      diffuseSafeSessions.set(message.sender, {
        step: 3,
        message: msgToDiffuse,
        selectedGroupJids: selectedGroupJids
      });
      
      return await message.sendReply(
        `_⚡ *Choisissez la vitesse d'envoi Twilio API* :_\n\n` +
        `*1* ➔ 🐢 Normal (API) : _Recommandé si vous avez un compte récent_\n` +
        `*2* ➔ 🐇 Rapide (API) : _Bon équilibre_\n` +
        `*3* ➔ 🚀 Instantané : _Envoi massif très rapide._\n\n` +
        `_Répondez avec le chiffre (1, 2 ou 3)._`
      );
    }

    // Étape 3 : Lancement
    if (session.step === 3 && repliedText.includes("Choisissez la vitesse d'envoi Twilio API")) {
      const answer = parseInt(message.text.trim());
      
      if (![1, 2, 3].includes(answer)) {
        return await message.sendReply("_❌ Choix invalide. Veuillez répondre par 1, 2 ou 3._");
      }

      diffuseSafeSessions.delete(message.sender);
      
      return diffuseSafeMessage(message, session.message, session.selectedGroupJids, answer);
    }
  }
);
