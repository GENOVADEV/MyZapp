// core/settings.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- SYSTÈME DE CACHE EN MÉMOIRE (RAM) ---
const settingsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // Durée de vie du cache : 5 minutes (en millisecondes)

/**
 * Récupère les configurations d'un bot et d'un groupe de manière optimisée
 * @param {string} botPhone - Le numéro du bot
 * @param {string} jid - L'ID du chat/groupe (optionnel)
 * @returns {Promise<{global: object, ai: object, group: object}>}
 */
async function getAppConfigs(botPhone, jid = null) {
  // Structure par défaut si rien n'est trouvé
  const defaultConfigs = { global: {}, ai: {}, group: {} };
  
  if (!botPhone) return defaultConfigs;

  const isGroup = jid && jid.endsWith('@g.us');
  // On fabrique une clé de cache unique. Ex: "237691..._12345@g.us" ou "237691..._dm"
  const cacheKey = `${botPhone}_${isGroup ? jid : 'dm'}`;

  // 🟢 1. VÉRIFICATION DU CACHE
  if (settingsCache.has(cacheKey)) {
    const cachedData = settingsCache.get(cacheKey);
    // Si le cache a moins de 5 minutes, on l'utilise direct (0 requête DB !)
    if (Date.now() - cachedData.timestamp < CACHE_TTL) {
      return cachedData.configs;
    }
    // S'il est trop vieux, on le supprime pour le rafraîchir
    settingsCache.delete(cacheKey);
  }

  // 🟡 2. REQUÊTE VERS LA BASE DE DONNÉES (Si pas de cache valide)
  try {
    // A. On récupère la session du bot et ses réglages globaux
    const appSession = await prisma.appWhatsAppSession.findFirst({
      where: { botPhone: botPhone },
      include: {
        globalSettings: true,
        aiPrompts: true,
      }
    });

    if (!appSession) return defaultConfigs;

    let groupSettings = {};

    // B. Si le message vient d'un groupe, on récupère les réglages de ce groupe
    if (isGroup) {
      const dbGroupSettings = await prisma.groupSettings.findUnique({
        where: {
          appSessionId_groupId: {
            appSessionId: appSession.id,
            groupId: jid
          }
        }
      });
      if (dbGroupSettings) groupSettings = dbGroupSettings;
    }

    const finalConfigs = {
      global: appSession.globalSettings || {},
      ai: appSession.aiPrompts || {},
      group: groupSettings
    };

    // 🟢 3. ON SAUVEGARDE EN MÉMOIRE POUR LES 5 PROCHAINES MINUTES
    settingsCache.set(cacheKey, {
      timestamp: Date.now(),
      configs: finalConfigs
    });

    return finalConfigs;

  } catch (error) {
    console.error("❌ [Settings Cache] Erreur DB :", error.message);
    // En cas d'erreur de la DB, on renvoie du vide pour ne pas crasher le bot
    return defaultConfigs;
  }
}

/**
 * Fonction pour forcer la suppression du cache 
 * (Très utile pour appliquer instantanément une modif faite sur le Dashboard)
 */
function clearConfigsCache(botPhone) {
  for (const key of settingsCache.keys()) {
    if (key.startsWith(`${botPhone}_`)) {
      settingsCache.delete(key);
    }
  }
}

module.exports = {
  getAppConfigs,
  clearConfigsCache
};