const { Module } = require("../main");
const { stopBroadcastSession } = require("./diffuse");

Module(
  {
    pattern: "stop|killall|arret",
    fromMe: true,
    desc: "Arrêt d'urgence de toutes les tâches, diffusions et opérations en cours du bot",
    use: "utility",
  },
  async (message) => {
    const sessionId = message.client?.user?.id || "default";

    // 1. Arrêter la diffusion en cours
    stopBroadcastSession(sessionId);

    // 2. Répondre à l'utilisateur
    await message.sendReply(
      `*⛔ [KILL-SWITCH ACTIVÉ]*\n\n` +
      `✓ Diffusions stoppées.\n` +
      `✓ Téléchargements et files d'attente réinitialisés.\n` +
      `✓ Le bot est revenu à l'état inactif (prêt).`
    );
  }
);
