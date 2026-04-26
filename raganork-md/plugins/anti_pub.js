const { Module } = require('../main');

Module({
    on: 'text', // Écoute tout le texte qui passe
    fromMe: true // On vérifie surtout les messages que TON bot envoie
}, async (message) => {
    try {
        if (!message.text) return;

        // Les mots-clés qui déclenchent la suppression
        const isSpamRaganork = message.text.includes("Our WhatsApp bot service is always FREE") || message.text.includes("Total QR scans") || message.text.includes("raganork");

        if (isSpamRaganork) {
            console.log("🛡️ [ANTI-PUB] Message du créateur détecté... Suppression immédiate !");

            // Suppression du message pour tout le monde
            // Dans anti_pub.js
            const cleanKey = {
                remoteJid: message.key.remoteJid || message.jid,
                id: message.key.id,
                fromMe: message.key.fromMe !== undefined ? message.key.fromMe : (message.fromMe || false),
                participant: message.key.participant || undefined
            };
            await message.client.sendMessage(message.jid, { delete: cleanKey });
            console.log("✅ Message supprimé avec succès !");}
    } catch (error) {
        console.error("❌ Erreur Anti-Pub :", error.message);
    }
});