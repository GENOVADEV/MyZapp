const config = require("../config");
const { BotUsageDB } = require("../plugins/utils/db/models");

const PLAN_LIMITS = {
    FREE: { name: "Gratuit 🥉", maxDailyCommands: 50, allowedFeatures: ["general", "utility", "search", "misc"] },
    YOUNG: { name: "Young 🌱", maxDailyCommands: 150, allowedFeatures: ["general", "utility", "search", "misc", "download", "edit", "converters", "whatsapp"] },
    AGENT: { name: "Agent 🕵️‍♂️", maxDailyCommands: 300, allowedFeatures: ["general", "utility", "search", "misc", "download", "edit", "converters", "whatsapp", "group"] },
    BUSINESS: { name: "Business 💼", maxDailyCommands: 1000, allowedFeatures: ["general", "utility", "search", "misc", "download", "edit", "converters", "whatsapp", "group", "settings", "system"] },
    PRO: { name: "Pro 🚀", maxDailyCommands: 999999, allowedFeatures: ["all"] }
};

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

        const limits = PLAN_LIMITS[userPlan] || PLAN_LIMITS.FREE;
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