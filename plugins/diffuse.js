const { Module } = require("../main");

// Map to store diffusion sessions. Key = sender JID
const diffuseSessions = new Map();

// Helper to add sleep delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function diffuseMessage(message, msgToDiffuse, selectedGroupJids) {
    let statusMsg;
    try {
        statusMsg = await message.sendReply(`_⏳ Préparation de la diffusion vers ${selectedGroupJids.length} groupe(s)..._`);
        
        let targetMembers = new Set();
        let totalAdminsSkipped = 0;

        for (let groupJid of selectedGroupJids) {
            try {
                const groupMetadata = await message.client.groupMetadata(groupJid);
                const participants = groupMetadata.participants;
                
                for (let participant of participants) {
                    // Ignorer les administrateurs et superadministrateurs
                    if (participant.admin === "admin" || participant.admin === "superadmin") {
                        totalAdminsSkipped++;
                        continue;
                    }
                    targetMembers.add(participant.id);
                }
            } catch (err) {
                console.error(`Erreur récupération métadonnées groupe ${groupJid}`, err);
            }
        }

        const targetsArray = Array.from(targetMembers);
        const total = targetsArray.length;

        if (total === 0) {
            return await message.edit(`_⚠️ Aucun membre trouvé pour la diffusion (ou tous sont admins)._`, message.jid, statusMsg.key);
        }

        await message.edit(`_🚀 Début de la diffusion à ${total} membre(s) (anti-spam activé)..._`, message.jid, statusMsg.key);

        let sentCount = 0;
        let failedCount = 0;

        for (let i = 0; i < total; i++) {
            const targetJid = targetsArray[i];
            try {
                await message.client.sendMessage(targetJid, { text: msgToDiffuse });
                sentCount++;
            } catch (error) {
                failedCount++;
            }

            // Mettre à jour l'évolution tous les 5 messages ou à la fin
            if (sentCount % 5 === 0 || i === total - 1) {
                const percent = Math.floor(((i + 1) / total) * 100);
                await message.edit(`_🔄 Diffusion en cours : ${percent}% (${i + 1}/${total})_`, message.jid, statusMsg.key);
            }

            // Délai aléatoire anti-spam entre 3000ms et 6000ms
            if (i < total - 1) {
                const delay = Math.floor(Math.random() * (6000 - 3000 + 1)) + 3000;
                await sleep(delay);
            }
        }

        await message.edit(`_✅ Diffusion terminée !_\n_Envoyés : ${sentCount}_\n_Échecs : ${failedCount}_\n_Admins ignorés : ${totalAdminsSkipped}_`, message.jid, statusMsg.key);
        
    } catch (e) {
        console.error("Erreur globale diffuse:", e);
        if (statusMsg) {
            await message.edit("_❌ Une erreur est survenue lors de la diffusion._", message.jid, statusMsg.key);
        } else {
            await message.sendReply("_❌ Une erreur est survenue._");
        }
    }
}

Module(
    {
        pattern: "diffuse ?(.*)",
        desc: "Diffuse un message en privé à tous les membres d'un ou plusieurs groupes (sauf admins).",
        use: "owner",
        fromMe: true // Seulement le propriétaire du bot (owner)
    },
    async (message, match) => {
        const arg = match[1]?.trim();

        // 1. Syntaxe directe: .diffuse <message> | <groupe1,groupe2|all>
        if (arg && arg.includes("|")) {
            const parts = arg.split("|");
            const msgToDiffuse = parts[0].trim();
            const groupTarget = parts[1].trim().toLowerCase();
            
            if (!msgToDiffuse || !groupTarget) {
                return await message.sendReply("_❌ Syntaxe incorrecte. Exemple: .diffuse Coucou | all_");
            }

            const groupsObj = await message.client.groupFetchAllParticipating();
            const allGroups = Object.values(groupsObj);
            
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

        // 2. Syntaxe interactive étape 1 (Demander le message)
        diffuseSessions.set(message.sender, { step: 1, message: null, groups: null });
        await message.sendReply("_Veuillez répondre à ce message avec le texte que vous souhaitez diffuser._");
    }
);

Module(
    {
        on: "text",
        fromMe: true
    },
    async (message) => {
        if (!message.reply_message) return;
        
        const session = diffuseSessions.get(message.sender);
        if (!session) return;

        const repliedText = message.reply_message.text;

        // Étape 1 : Enregistrement du message et choix des groupes
        if (session.step === 1 && repliedText.includes("Veuillez répondre à ce message avec le texte")) {
            const msgToDiffuse = message.text;
            
            if (!msgToDiffuse) {
                return await message.sendReply("_❌ Veuillez fournir un message texte valide._");
            }

            // Récupérer les groupes
            const groupsObj = await message.client.groupFetchAllParticipating();
            const allGroups = Object.values(groupsObj);
            
            if (allGroups.length === 0) {
                diffuseSessions.delete(message.sender);
                return await message.sendReply("_❌ Vous n'êtes dans aucun groupe._");
            }

            let groupListText = "_Voici la liste de vos groupes :_\n\n";
            allGroups.forEach((g, index) => {
                groupListText += `*${index + 1}.* ${g.subject}\n`;
            });
            groupListText += "\n_Répondez à ce message avec les numéros des groupes séparés par une virgule (ex: 1,3), ou répondez 'all' pour tous les groupes._";

            diffuseSessions.set(message.sender, { 
                step: 2, 
                message: msgToDiffuse, 
                groups: allGroups 
            });

            return await message.sendReply(groupListText);
        }

        // Étape 2 : Lancement de la diffusion
        if (session.step === 2 && repliedText.includes("Voici la liste de vos groupes")) {
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

            diffuseSessions.delete(message.sender); // Libérer la session

            if (selectedGroupJids.length === 0) {
                return await message.sendReply("_❌ Sélection invalide. Opération annulée._");
            }

            return diffuseMessage(message, msgToDiffuse, selectedGroupJids);
        }
    }
);
