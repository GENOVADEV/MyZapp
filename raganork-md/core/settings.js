// core/settings.js
// ⚠️ VÉRIFIE CE CHEMIN : Assure-toi que le chemin vers ton fichier database est correct
const { sequelize } = require('../database'); // ou "./database" selon où se trouve settings.js
const { QueryTypes } = require('sequelize');

// --- SYSTÈME DE CACHE EN MÉMOIRE (RAM) ---
const settingsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // Durée de vie du cache : 5 minutes

/**
 * Récupère les configurations d'un bot et d'un groupe via Sequelize
 * @param {string} botPhone - Le numéro du bot
 * @param {string} jid - L'ID du chat/groupe (optionnel)
 * @returns {Promise<{global: object, ai: object, group: object}>}
 */
async function getAppConfigs(botPhone, jid = null) {
  const defaultConfigs = { global: {}, ai: {}, group: {} };
  
  if (!botPhone) return defaultConfigs;

  const isGroup = jid && jid.endsWith('@g.us');
  const cacheKey = `${botPhone}_${isGroup ? jid : 'dm'}`;

  // 🟢 1. VÉRIFICATION DU CACHE
  if (settingsCache.has(cacheKey)) {
    const cachedData = settingsCache.get(cacheKey);
    if (Date.now() - cachedData.timestamp < CACHE_TTL) {
      return cachedData.configs;
    }
    settingsCache.delete(cacheKey);
  }

  // 🟡 2. REQUÊTES VERS LA BASE DE DONNÉES (Via Sequelize SQL Brut)
  try {
    // A. Trouver l'ID de la session du bot
    // (Les guillemets "" sont importants pour PostgreSQL avec Prisma)
    const sessions = await sequelize.query(
      `SELECT id FROM "AppWhatsAppSessions" WHERE "botPhone" = :botPhone LIMIT 1`,
      {
        replacements: { botPhone: botPhone },
        type: QueryTypes.SELECT
      }
    );

    if (!sessions || sessions.length === 0) return defaultConfigs;
    const appSessionId = sessions[0].id;

    // B. Récupérer les réglages globaux
    const globalSettings = await sequelize.query(
      `SELECT * FROM "bot_global_settings" WHERE "appSessionId" = :appSessionId LIMIT 1`,
      {
        replacements: { appSessionId: appSessionId },
        type: QueryTypes.SELECT
      }
    );

    // C. Récupérer les réglages de l'IA
    const aiPrompts = await sequelize.query(
      `SELECT * FROM "ai_prompts" WHERE "appSessionId" = :appSessionId LIMIT 1`,
      {
        replacements: { appSessionId: appSessionId },
        type: QueryTypes.SELECT
      }
    );

    // D. Récupérer les réglages du groupe (Si le message vient d'un groupe)
    let groupSettings = [];
    if (isGroup) {
      groupSettings = await sequelize.query(
        `SELECT * FROM "group_settings" WHERE "appSessionId" = :appSessionId AND "groupId" = :groupId LIMIT 1`,
        {
          replacements: { appSessionId: appSessionId, groupId: jid },
          type: QueryTypes.SELECT
        }
      );
    }

    // On assemble les données (S'il n'y a pas de résultat, on met un objet vide {})
    const finalConfigs = {
      global: globalSettings.length > 0 ? globalSettings[0] : {},
      ai: aiPrompts.length > 0 ? aiPrompts[0] : {},
      group: groupSettings.length > 0 ? groupSettings[0] : {}
    };

    // 🟢 3. ON SAUVEGARDE EN MÉMOIRE
    settingsCache.set(cacheKey, {
      timestamp: Date.now(),
      configs: finalConfigs
    });

    return finalConfigs;

  } catch (error) {
    console.error("❌ [Settings Cache Sequelize] Erreur DB :", error.message);
    return defaultConfigs;
  }
}

/**
 * Fonction pour forcer la suppression du cache 
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