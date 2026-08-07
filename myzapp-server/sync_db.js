require("dotenv").config({ path: "config.env" });
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require("./generated/prisma");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./bot.db",
  logging: false,
});

const tables = [
  { name: "_warns", prismaModel: prisma.warn },
  { name: "fakes", prismaModel: prisma.fake },
  { name: "antilinks", prismaModel: prisma.antilink },
  { name: "antilink_configs", prismaModel: prisma.antilinkConfig, idField: "jid" },
  { name: "antispams", prismaModel: prisma.antiSpam },
  { name: "pdms", prismaModel: prisma.pDM },
  { name: "antidemotes", prismaModel: prisma.antiDemote },
  { name: "antipromotes", prismaModel: prisma.antiPromote },
  { name: "antibots", prismaModel: prisma.antiBot },
  { name: "antiwords", prismaModel: prisma.antiWord },
  { name: "welcomes", prismaModel: prisma.welcome },
  { name: "goodbyes", prismaModel: prisma.goodbye },
  { name: "filters", prismaModel: prisma.filter },
  { name: "WhatsappSessions", prismaModel: prisma.whatsappSession, idField: "sessionId" },
  { name: "bot_variables", prismaModel: prisma.botVariable, idField: "key" },
];

async function sync() {
  console.log("🚀 Démarrage de la synchronisation de SQLite local vers PostgreSQL cloud...");
  try {
    await sequelize.authenticate();
    console.log("✅ Connecté à la base de données locale (bot.db)");
  } catch (error) {
    console.error("❌ Impossible de se connecter à SQLite:", error);
    return;
  }

  for (const table of tables) {
    console.log(`\n📦 Synchronisation de la table: ${table.name}...`);
    try {
      const [results] = await sequelize.query(`SELECT * FROM "${table.name}"`);
      
      if (results.length === 0) {
        console.log(`   - ℹ️ Aucun enregistrement dans ${table.name}`);
        continue;
      }
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const row of results) {
        try {
          const idField = table.idField || "id";
          const idValue = row[idField];
          
          if (idValue === undefined || idValue === null) {
             console.log(`   - ⚠️ Ligne ignorée (Champ ${idField} manquant) dans ${table.name}`);
             continue;
          }

          const existing = await table.prismaModel.findUnique({
            where: { [idField]: idValue }
          });
          
          if (row.createdAt && typeof row.createdAt === 'string') row.createdAt = new Date(row.createdAt);
          if (row.updatedAt && typeof row.updatedAt === 'string') row.updatedAt = new Date(row.updatedAt);
          if (row.timestamp && typeof row.timestamp === 'string') row.timestamp = new Date(row.timestamp);

          if (existing) {
             await table.prismaModel.update({
               where: { [idField]: idValue },
               data: row
             });
          } else {
             await table.prismaModel.create({
               data: row
             });
          }
          successCount++;
        } catch (err) {
          console.error(`   - ❌ Échec sur une ligne de ${table.name}:`, err.message);
          errorCount++;
        }
      }
      
      console.log(`   - ✅ Synchronisé: ${successCount} enregistrement(s). (${errorCount} erreurs)`);
    } catch (e) {
      if (e.message.includes("no such table")) {
         console.log(`   - ⚠️ La table ${table.name} n'existe pas localement. Ignorée.`);
      } else {
         console.error(`   - ❌ Erreur de lecture sur ${table.name}:`, e.message);
      }
    }
  }

  console.log("\n🎉 Synchronisation terminée ! Vos données sont dans le cloud.");
  await prisma.$disconnect();
  await sequelize.close();
}

sync();
