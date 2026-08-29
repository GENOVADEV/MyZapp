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
    pattern: "edit ?(.*)",
    fromMe: true,
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

// ----------------------------------------------------------------------------------
// ANTI-VUE UNIQUE (MANUEL & ENVOI DIRECT DANS LA DISCUSSION AVEC SOI-MÊME)
// ----------------------------------------------------------------------------------
Module(
  {
    pattern: "vv ?(.*)",
    fromMe: true,
    desc: "Déverrouille un message vue unique et l'envoie dans votre discussion privée",
    use: "utility",
  },
  async (m, match) => {
    const quoted = m.quoted?.message;
    if (!m.reply_message || !quoted) {
      return await m.sendReply("_⚠️ Veuillez répondre à un message envoyé en vue unique._");
    }

    // Le destinataire par défaut est la discussion de l'utilisateur avec lui-même
    const selfJid = m.client?.user?.id
      ? m.client.user.id.split(":")[0] + "@s.whatsapp.net"
      : m.sender;
    
    let destinationJid = (match[1] && match[1].includes("@")) ? match[1].trim() : selfJid;

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
      
      await m.forwardMessage(destinationJid, m.quoted, {
        contextInfo: { isForwarded: false },
      });

      if (destinationJid === selfJid && m.jid !== selfJid) {
        await m.sendReply(`_🔓 Message vue unique récupéré et envoyé dans votre discussion privée !_`);
      }
      return;
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
      await m.forwardMessage(destinationJid, m.quoted, {
        contextInfo: { isForwarded: false },
      });

      if (destinationJid === selfJid && m.jid !== selfJid) {
        await m.sendReply(`_🔓 Message vue unique récupéré et envoyé dans votre discussion privée !_`);
      }
      return;
    }

    await m.sendReply("_⚠️ Ce message n'est pas un média en vue unique._");
  }
);

// ----------------------------------------------------------------------------------
// ANTI-VUE UNIQUE AUTOMATIQUE (Capture en direct dans les groupes & DMs)
// ----------------------------------------------------------------------------------
Module(
  {
    on: "message",
    fromMe: false,
  },
  async (m) => {
    try {
      const rawMsg = m.message;
      if (!rawMsg) return;

      const viewOnceKey = [
        "viewOnceMessage",
        "viewOnceMessageV2",
        "viewOnceMessageV2Extension",
      ].find((key) => rawMsg.hasOwnProperty(key));

      if (viewOnceKey) {
        const realMessage = rawMsg[viewOnceKey].message;
        const msgType = Object.keys(realMessage)[0];
        if (realMessage[msgType]) {
          realMessage[msgType].viewOnce = false;
        }

        const selfJid = m.client?.user?.id
          ? m.client.user.id.split(":")[0] + "@s.whatsapp.net"
          : null;

        if (selfJid) {
          const senderNum = m.sender ? m.sender.split("@")[0] : "Inconnu";
          const isGroup = m.jid.endsWith("@g.us");
          const captionHeader = `🔓 *[MYZAPP - ANTI VUE UNIQUE DÉTECTÉ]*\n👤 *Expéditeur :* +${senderNum}\n📍 *Provenance :* ${isGroup ? "Groupe (" + m.jid + ")" : "Message Privé (DM)"}\n🕒 *Reçu à :* ${new Date().toLocaleTimeString("fr-FR")}`;

          await m.client.sendMessage(selfJid, {
            text: captionHeader
          });

          // Forward du message déverrouillé
          await m.client.sendMessage(selfJid, {
            forward: {
              key: m.key,
              message: realMessage
            }
          });
        }
      }
    } catch (err) {
      // Ignore background processing errors
    }
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
