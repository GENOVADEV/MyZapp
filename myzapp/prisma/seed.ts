// import { PrismaClient, Plan } from '@prisma/client';

// const prisma = new PrismaClient();

// async function main() {
//   console.log("🌱 Début du remplissage de la base de données...");

//   // ----------------------------------------------------
//   // 1. INITIALISATION DES FORFAITS (PlanConfig)
//   // ----------------------------------------------------
//   const plans = [
//     { plan: Plan.FREE, displayName: "Gratuit 🥉", maxDailyCommands: 50, priceXaf: 0, priceEur: 0, priceUsd: 0 },
//     { plan: Plan.YOUNG, displayName: "Young 🌱", maxDailyCommands: 150, priceXaf: 2000, priceEur: 3, priceUsd: 4 },
//     { plan: Plan.AGENT, displayName: "Agent 🕵️‍♂️", maxDailyCommands: 300, priceXaf: 5000, priceEur: 8, priceUsd: 9 },
//     { plan: Plan.BUSINESS, displayName: "Business 💼", maxDailyCommands: 1000, priceXaf: 10000, priceEur: 15, priceUsd: 17 },
//     { plan: Plan.PRO, displayName: "Pro 🚀", maxDailyCommands: 999999, priceXaf: 20000, priceEur: 30, priceUsd: 33 }
//   ];

//   for (const p of plans) {
//     // upsert = Met à jour si ça existe déjà, sinon le crée
//     await prisma.planConfig.upsert({
//       where: { plan: p.plan },
//       update: p,
//       create: p,
//     });
//   }
//   console.log("✅ Forfaits (PlanConfig) injectés !");

//   // ----------------------------------------------------
//   // 2. INITIALISATION DES FONCTIONNALITÉS (Feature)
//   // ----------------------------------------------------
//   const features = [
//     // --- Niveau GRATUIT (Inclus dans tous les plans) ---
//     { categoryCode: "general", displayName: "Général", description: "Commandes de base", allowedPlans: [Plan.FREE, Plan.YOUNG, Plan.AGENT, Plan.BUSINESS, Plan.PRO] },
//     { categoryCode: "utility", displayName: "Utilitaires", description: "Outils pratiques divers", allowedPlans: [Plan.FREE, Plan.YOUNG, Plan.AGENT, Plan.BUSINESS, Plan.PRO] },
//     { categoryCode: "search", displayName: "Recherche", description: "Recherches internet et IA", allowedPlans: [Plan.FREE, Plan.YOUNG, Plan.AGENT, Plan.BUSINESS, Plan.PRO] },
//     { categoryCode: "misc", displayName: "Divers", description: "Jeux et commandes fun", allowedPlans: [Plan.FREE, Plan.YOUNG, Plan.AGENT, Plan.BUSINESS, Plan.PRO] },

//     // --- Niveau YOUNG & Supérieur ---
//     { categoryCode: "download", displayName: "Téléchargements", description: "Télécharger musiques et vidéos", allowedPlans: [Plan.YOUNG, Plan.AGENT, Plan.BUSINESS, Plan.PRO] },
//     { categoryCode: "edit", displayName: "Édition", description: "Manipulation d'images et vidéos", allowedPlans: [Plan.YOUNG, Plan.AGENT, Plan.BUSINESS, Plan.PRO] },
//     { categoryCode: "converters", displayName: "Convertisseurs", description: "Création de stickers, etc.", allowedPlans: [Plan.YOUNG, Plan.AGENT, Plan.BUSINESS, Plan.PRO] },

//     // --- Niveau AGENT & Supérieur ---
//     { categoryCode: "whatsapp", displayName: "Outils WhatsApp", description: "Outils spécifiques à la messagerie", allowedPlans: [Plan.AGENT, Plan.BUSINESS, Plan.PRO] },
//     { categoryCode: "group", displayName: "Gestion de Groupe", description: "Commandes d'administration de groupe", allowedPlans: [Plan.AGENT, Plan.BUSINESS, Plan.PRO] },


//     // --- Niveau BUSINESS & Supérieur ---
//     { categoryCode: "settings", displayName: "Paramètres", description: "Réglages avancés du bot", allowedPlans: [Plan.BUSINESS, Plan.PRO] },
//     { categoryCode: "system", displayName: "Système", description: "Commandes de gestion du système", allowedPlans: [Plan.BUSINESS, Plan.PRO] },

//     // --- Niveau PRO uniquement ---
//     { categoryCode: "all", displayName: "Accès Total", description: "Accès illimité sans restriction", allowedPlans: [Plan.PRO] }
//   ];

//   for (const f of features) {
//     await prisma.feature.upsert({
//       where: { categoryCode: f.categoryCode },
//       update: f,
//       create: f,
//     });
//   }
//   console.log("✅ Fonctionnalités (Feature) injectées !");
// }

// main()
//   .catch((e) => {
//     console.error("❌ Erreur pendant le Seed :", e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });