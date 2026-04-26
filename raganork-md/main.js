const config = require("./config");

const Commands = [];
let commandPrefix;
let handlerPrefix;

function escapeRegex(str) {
  return String(str).replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function buildHandlerPrefix(rawHandlers, allowNoPrefix) {
  if (rawHandlers === "^" || rawHandlers === "" || rawHandlers == null) {
    return "^";
  }

  const handlersStr = String(rawHandlers);

  if (handlersStr.length > 1 && handlersStr[0] === handlersStr[1]) {
    const literal = `^${escapeRegex(handlersStr)}`;
    return allowNoPrefix ? `${literal}?` : literal;
  }

  const parts = Array.from(handlersStr)
    .map((h) => escapeRegex(h))
    .filter(Boolean);

  if (parts.length === 0) {
    return "^";
  }

  const group = `^(?:${parts.join("|")})`;
  return allowNoPrefix ? `${group}?` : group;
}

if (config.HANDLERS === "false") {
  commandPrefix = "^";
} else {
  commandPrefix = config.HANDLERS;
}

handlerPrefix = buildHandlerPrefix(commandPrefix, Boolean(config.MULTI_HANDLERS));

function Module(info, func) {
  const validEventTypes = [
    "photo",
    "image",
    "text",
    "button",
    "group-update",
    "message",
    "start",
  ];

  // --- DÉBUT DE LA SÉCURISATION ---
  const securedFunction = async (message, match) => {
    try {
      const isBackgroundEvent = info.on && !["message", "text", "image", "photo", "video", "document"].includes(info.on);
      if (isBackgroundEvent) {
        return await func(message, match);
      }

      const rawBotId = (message.client && message.client.user) ? message.client.user.id : null;
      if (!rawBotId) {
        console.error("⚠️ Alerte Sécurité : ID du bot introuvable.");
        return;
      }

      const botPhone = rawBotId.split(':')[0].split('@')[0].replace(/[^0-9]/g, '');
      const sender = message.sender || (message.key && (message.key.participant || message.key.remoteJid)) || "";
      const senderNumber = sender.split('@')[0];
      const isSudo = message.fromMe || senderNumber === botPhone || (config.SUDO && String(config.SUDO).includes(senderNumber));

      const isExplicitCommand = info.pattern !== undefined;
      const category = (info.use || "general").toLowerCase();
      const messageId = (message.key && message.key.id) ? message.key.id : "msg_" + Math.random();

      const limitCheck = await checkUserLimits(botPhone, category, isSudo, isExplicitCommand, messageId);

      if (!limitCheck.allowed) {
        if (!limitCheck.silent && limitCheck.message && typeof message.sendReply === 'function') {
          return await message.sendReply(limitCheck.message);
        }
        return;
      }

      // 🧹 LA SUPPRESSION AUTO DE LA COMMANDE (Mode Ninja)
      if (isExplicitCommand) {
        try {
          const isGroup = message.jid && message.jid.endsWith('@g.us');
          if (isGroup) {
            await message.client.sendMessage(message.jid, { delete: message.key });
          }
        } catch (deleteError) {
          console.log(`[Auto-Delete] Impossible de supprimer la commande.`);
        }
      }

      return await func(message, match);

    } catch (error) {
      console.error(`❌ Erreur d'exécution du plugin :`, error.message);
    }
  };
  // --- FIN DE LA SÉCURISATION ---

  const commandInfo = {
    fromMe: info.fromMe ?? config.isPrivate,
    desc: info.desc ?? "",
    usage: info.usage ?? "",
    excludeFromCommands: info.excludeFromCommands ?? false,
    warn: info.warn ?? "",
    use: info.use ?? "",
    function: securedFunction,
  };

  if (info.on === undefined && info.pattern === undefined) {
    commandInfo.on = "message";
    commandInfo.fromMe = false;
  } else if (info.on !== undefined && validEventTypes.includes(info.on)) {
    commandInfo.on = info.on;
    if (info.pattern !== undefined) {
      const prefix = (info.handler ?? true) ? handlerPrefix : "";
      const patternStr = `${prefix}${info.pattern}`;
      commandInfo.pattern = new RegExp(patternStr, "s");
    }
  } else if (info.pattern !== undefined) {
    const prefix = (info.handler ?? true) ? handlerPrefix : "";
    const patternStr = `${prefix}${info.pattern}`;
    commandInfo.pattern = new RegExp(patternStr, "s");
  }

  Commands.push(commandInfo);
  return commandInfo;
}

module.exports = {
  Module,
  commands: Commands,
};
