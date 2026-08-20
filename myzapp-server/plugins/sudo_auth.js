const { Module } = require("../main");
const config = require("../config");

const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || "MyZappAdmin";

Module(
  {
    pattern: "login ?(.*)",
    fromMe: false, // Permet à n'importe qui d'essayer la commande
    desc: "Authentification pour devenir Sudo dynamiquement",
    use: "utility",
  },
  async (message, match) => {
    const pwd = match[1]?.trim();

    // 1. Suppression immédiate du message contenant le mot de passe
    if (message.key) {
      try {
        await message.client.sendMessage(message.jid, { delete: message.key });
      } catch (err) {
        console.error("Erreur lors de la suppression du message de login :", err);
      }
    }

    // Si pas de mot de passe fourni, on ne fait rien (échec silencieux pour éviter le spam)
    if (!pwd) return;

    // 2. Vérification du mot de passe
    if (pwd === LOGIN_PASSWORD) {
      const userJid = message.sender.split("@")[0];
      let currentSudos = config.SUDO || "";

      // 3. Ajout à la configuration globale si pas déjà présent
      if (!currentSudos.includes(userJid)) {
        config.SUDO = currentSudos ? currentSudos + "," + userJid : userJid;
        
        // On sauvegarde également dans process.env pour une compatibilité maximale
        process.env.SUDO = config.SUDO;

        await message.client.sendMessage(message.jid, { 
          text: "_✅ Authentification réussie. Votre numéro est désormais enregistré comme SUDO (Administrateur du bot) pour cette session._\n_Vous pouvez exécuter des commandes comme .add, .users, ou envoyer des messages au nom du bot._" 
        });
      } else {
        await message.client.sendMessage(message.jid, { 
          text: "_✅ Vous êtes déjà authentifié comme SUDO._" 
        });
      }
    } else {
      // Message d'erreur
      await message.client.sendMessage(message.jid, { 
        text: "_❌ Échec de l'authentification. Mot de passe incorrect._" 
      });
    }
  }
);
