const config = require("../config");
const { BotUsageDB, PlanConfigDB, FeatureDB } = require("../plugins/utils/db/models");

// On crée des variables vides qui vont stocker les règles en mémoire
let DYNAMIC_PLAN_LIMITS = null;
let lastCacheUpdate = 0;

// Fonction pour rafraîchir le cache toutes les 5 minutes (300 000 ms)
async function getDynamicLimits() {
    const now = Date.now();

    // Si on a déjà les limites et qu'elles ont moins de 5 minutes, on les réutilise (Ultra rapide ⚡)
    if (DYNAMIC_PLAN_LIMITS && (now - lastCacheUpdate < 300000)) {
        return DYNAMIC_PLAN_LIMITS;
    }

    try {
        // Sinon, on va lire la base de données PostgreSQL
        const plans = await PlanConfigDB.findAll({ raw: true });
        const features = await FeatureDB.findAll({ where: { isActive: true }, raw: true });

        // On reconstruit l'objet à la volée exactement comme l'ancien PLAN_LIMITS !
        const newLimits = {};

        for (const p of plans) {
            // On cherche toutes les features autorisées pour ce plan spécifique
            const allowed = features
                .filter(f => f.allowedPlans.includes(p.plan) || f.allowedPlans.includes("ALL"))
                .map(f => f.categoryCode);

            newLimits[p.plan] = {
                name: p.displayName,
                maxDailyCommands: p.maxDailyCommands,
                allowedFeatures: allowed.length > 0 ? allowed : ["general"] // Sécurité par défaut
            };
        }

        DYNAMIC_PLAN_LIMITS = newLimits;
        lastCacheUpdate = now;
        console.log("🔄 [SUBSCRIPTION] Règles des forfaits mises à jour depuis la BD !");

        return DYNAMIC_PLAN_LIMITS;

    } catch (error) {
        console.error("❌ ERREUR CHARGEMENT FORFAITS :", error);
        // En cas de gros crash de la BD, on renvoie un plan de secours pour ne pas bloquer le bot
        return { FREE: { name: "Secours 🛟", maxDailyCommands: 50, allowedFeatures: ["general"] } };
    }
}

// 🌟 LA MÉMOIRE CACHE (Garde les ID des messages déjà facturés)
const processedMessages = new Set();

async function checkUserLimits(botPhone, commandCategory, isSudo = false, isExplicitCommand = true, messageId = null) {
    try {
        if (isSudo) return { allowed: true };
        if (!botPhone || botPhone === 'undefined') return { allowed: true };

        const today = new Date().toISOString().split('T')[0];
        // Prisma a besoin d'une date exacte (Minuit UTC)
        const todayDate = new Date(`${today}T00:00:00.000Z`);

        // 1. On cherche le plan de l'utilisateur (Ici le SQL pur marche bien car c'est juste un SELECT avec des guillemets corrects)
        const [appSessions] = await config.sequelize.query(`
            SELECT "userId" FROM "AppWhatsAppSessions" WHERE "botPhone" = '${botPhone}' LIMIT 1;
        `);

        let userPlan = "FREE";
        if (appSessions.length > 0) {
            const userId = appSessions[0].userId;
            const [userRecords] = await config.sequelize.query(`SELECT plan FROM "User" WHERE id = '${userId}' LIMIT 1;`);
            if (userRecords.length > 0) userPlan = userRecords[0].plan;
        }

        const dynamicLimits = await getDynamicLimits();
        const limits = dynamicLimits[userPlan] || dynamicLimits.FREE;
        const category = (commandCategory || "general").toLowerCase();

        // 2. Gestion des plugins "Fantômes"
        if (!isExplicitCommand) {
            if (limits.allowedFeatures[0] !== "all" && !limits.allowedFeatures.includes(category)) {
                return { allowed: false, silent: true };
            }
            return { allowed: true };
        }

        // 3. LE BOUCLIER ANTI-DOUBLE COMPTAGE
        if (messageId && processedMessages.has(messageId)) {
            return { allowed: true };
        }

        // --- EXÉCUTION DU COMPTEUR 100% ORM (Fini les erreurs SQL !) ---

        // A. On cherche la ligne du jour, si elle n'existe pas, on demande au moteur de la créer proprement
        let usage = await BotUsageDB.findOne({ where: { sessionId: botPhone, date: todayDate } });

        if (!usage) {
            usage = await BotUsageDB.create({ sessionId: botPhone, date: todayDate, commandCount: 0 });
        }

        let currentCount = usage.commandCount;

        // B. Filtrage par Catégorie
        if (limits.allowedFeatures[0] !== "all" && !limits.allowedFeatures.includes(category)) {
            return {
                allowed: false, silent: false,
                message: `*───「 🔒 ACCÈS RESTREINT 」───*\n\n_La catégorie *${category}* est réservée aux abonnés supérieurs._\n\n⭐ *Forfait actuel :* ${limits.name}`
            };
        }

        // C. Vérification Quota Maximum
        if (currentCount >= limits.maxDailyCommands) {
            if (currentCount === limits.maxDailyCommands) {
                await usage.update({ commandCount: currentCount + 1 });
                return {
                    allowed: false, silent: false,
                    message: `*───「 ⏳ LIMITE ATTEINTE 」───*\n\n_Quota épuisé (${limits.maxDailyCommands}/${limits.maxDailyCommands})._`
                };
            } else {
                return { allowed: false, silent: true };
            }
        }

        // D. FACTURATION FINALE (+1)
        await usage.update({ commandCount: currentCount + 1 });

        // E. On mémorise le message
        if (messageId) {
            processedMessages.add(messageId);
            if (processedMessages.size > 200) {
                const oldestId = processedMessages.values().next().value;
                processedMessages.delete(oldestId);
            }
        }

        return { allowed: true };

    } catch (error) {
        console.error("❌ ERREUR SUBSCRIPTION :", error);
        return { allowed: true };
    }
}

module.exports = { checkUserLimits };