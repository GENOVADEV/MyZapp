const { Module } = require("../main");
const { isAdmin } = require("./utils");
const { ADMIN_ACCESS, MODE } = require("../config");
const isPrivateMode = MODE !== "public";
Module(
  {
    pattern: "react ?(.*)",
    fromMe: true,
    use: "whatsapp",
  },
  async (m, t) => {
    let msg = {
      remoteJid: m.reply_message?.jid,
      id: m.reply_message.id,
    };
    const reactionMessage = {
      react: {
        text: t[1],
        key: msg,
      },
    };

    await m.client.sendMessage(m.jid, reactionMessage);
  }
);
Module(
  {
    pattern: "modify ?(.*)",
    fromMe: true,
    desc: "Edits the replied message with new text",
    use: "whatsapp",
  },
  async (m, t) => {
    if (t[1] && m.reply_message?.text && m.quoted.key.fromMe) {
      await m.edit(t[1], m.jid, m.quoted.key);
    }
  }
);
Module(
  {
    pattern: "send ?(.*)",
    fromMe: true,
    desc: "Forwards replied message to the given jid",
    use: "whatsapp",
  },
  async (m, t) => {
    if (!m.reply_message) return await m.sendReply("_Reply to a message_");
    const query = t[1] || m.jid;
    const jidMap = query.split(" ").filter((x) => x.includes("@"));
    if (!jidMap.length) {
      return await m.sendReply(
        "_No valid JID found in the query, use `send jid1 jid2 ...`_"
      );
    }
    for (const jid of jidMap) {
      await m.forwardMessage(jid, m.quoted, {
        contextInfo: { isForwarded: false },
      });
    }
  }
);
Module(
  {
    pattern: "forward ?(.*)",
    fromMe: true,
    desc: "Forwards replied message to the given jid",
    use: "whatsapp",
  },
  async (m, t) => {
    if (!m.reply_message) return await m.sendReply("_Reply to a message_");
    const query = t[1] || m.jid;
    const jidMap = query.split(" ").filter((x) => x.includes("@"));
    if (!jidMap.length) {
      return await m.sendReply(
        "_No valid JID found in the query, use `forward jid1 jid2 ...`_"
      );
    }
    for (const jid of jidMap) {
      await m.forwardMessage(jid, m.quoted, {
        contextInfo: { isForwarded: true, forwardingScore: 2 },
      });
    }
  }
);
Module(
  {
    pattern: "retry ?(.*)",
    fromMe: isPrivateMode,
    desc: "Retries replied command to run the command again",
    use: "misc",
  },
  async (m, t) => {
    if (!m.reply_message)
      return await m.sendReply("_Reply to a command message_");
    await m.client.ev.emit("messages.upsert", {
      messages: [m.quoted],
      type: "notify",
    });
  }
);
Module(
  {
    pattern: "vv ?(.*)",
    fromMe: true,
    desc: "Anti view once",
    use: "utility",
  },
  async (m, match) => {
    const quoted = m.quoted?.message,
      realQuoted = m.quoted;

    if (!m.reply_message || !quoted) {
      return await m.sendReply("_Not a view once msg!_");
    }

    if (match[1] && match[1].includes("@")) m.jid = match[1];

    const viewOnceKey = [
      "viewOnceMessage",
      "viewOnceMessageV2",
      "viewOnceMessageV2Extension",
    ].find((key) => quoted.hasOwnProperty(key));

    if (viewOnceKey) {
      const realMessage = quoted[viewOnceKey].message;
      const msgType = Object.keys(realMessage)[0];
      if (realMessage[msgType]?.viewOnce) realMessage[msgType].viewOnce = false;
      m.quoted.message = realMessage;
      return await m.forwardMessage(m.jid, m.quoted, {
        contextInfo: { isForwarded: false },
      });
    }

    const directType = quoted.imageMessage
      ? "imageMessage"
      : quoted.audioMessage
      ? "audioMessage"
      : quoted.videoMessage
      ? "videoMessage"
      : null;

    if (directType && quoted[directType]?.viewOnce) {
      quoted[directType].viewOnce = false;
      return await m.forwardMessage(m.jid, m.quoted, {
        contextInfo: { isForwarded: false },
      });
    }

    await m.sendReply("_Not a view once msg!_");
  }
);
Module(
  {
    pattern: "delete",
    fromMe: true,
    desc: "Deletes message for everyone. Supports admin deletion",
  },
  async (m, t) => {
    let adminAccesValidated = ADMIN_ACCESS ? await isAdmin(m, m.sender) : false;
    if (!m.reply_message) return;
    if (m.fromOwner || adminAccesValidated) {
      m.jid = m.quoted.key.remoteJid;
      if (m.quoted.key.fromMe)
        return await m.client.sendMessage(m.jid, { delete: m.quoted.key });
      if (!m.quoted.key.fromMe) {
        var admin = await isAdmin(m);
        if (!admin) return await m.sendReply("_I'm not an admin!_");
        return await m.client.sendMessage(m.jid, { delete: m.quoted.key });
      }
    }
  }
);

Module(
  {
    // L'astuce est ici : on écoute TOUS les messages textuels en arrière-plan
    on: "text", 
    fromMe: false, // Ce plugin gère les messages des autres (et on gère le fromMe à l'intérieur)
    desc: "Auto-supprime les commandes selon les préférences de l'utilisateur (SaaS)",
  },
  async (message) => {
    try {
      // 1. On ignore si le message est vide
      if (!message.text) return;

      // 2. On vérifie si c'est bien une commande (ex: commence par un point '.')
      // Adapte la regex selon le préfixe de ton bot (ici on cherche les caractères spéciaux de base)
      const isCommand = /^[!./#*]/.test(message.text.trim());
      if (!isCommand) return; // Si c'est du blabla normal, on ignore.

      // 3. Extraction de l'ID du bot (pour lire les préférences dans la DB)
      const rawBotId = (message.client && message.client.user) ? message.client.user.id : null;
      if (!rawBotId) return;
      const botPhone = rawBotId.split(':')[0].split('@')[0].replace(/[^0-9]/g, '');

      // 4. On lit les réglages depuis la base de données (ou le cache)
      // L'idée est que checkUserLimits ou une autre fonction te renvoie les paramètres du dashboard
      const settings = await checkUserLimits(botPhone, "general", false, false, "auto_delete_check");
      
      // La fameuse variable qui vient de ton Dashboard !
      const isAutoDeleteEnabled = message.globalSettings.antiDeleteEnabled ||true; 

      // 5. Si l'option est désactivée, on s'arrête là.
      if (!isAutoDeleteEnabled) return;

      // 6. 🧹 EXECUTION DE LA SUPPRESSION 
      // On fabrique la clé de suppression parfaite
      const cleanKey = {
        remoteJid: message.key.remoteJid || message.jid,
        id: message.key.id,
        // On vérifie si c'est le bot lui-même qui a envoyé la commande
        fromMe: message.key.fromMe !== undefined ? message.key.fromMe : (message.fromMe || false),
        participant: message.key.participant || undefined
      };

      const targetJid = cleanKey.remoteJid;

      // On lance la suppression silencieusement
      if (message.client && typeof message.client.sendMessage === 'function') {
        message.client.sendMessage(targetJid, { delete: cleanKey }).catch((err) => {
          // Si on est dans un groupe et qu'on a pas les droits Admin, ça va échouer silencieusement.
          // C'est normal et voulu.
        });
      }

    } catch (error) {
      console.log(`[Auto-Delete Plugin] Erreur silencieuse :`, error.message);
    }
  }
);
