const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://joinvesting_db_user:nG3RMqgXwtnKf9zp5juQiESZB9N6VbJp@dpg-da10ckpt0dsc73ao2190-a.singapore-postgres.render.com/joinvesting_db?sslmode=require&schema=myzapp";

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function initDB() {
  try {
    console.log("Initialisation des tables PostgreSQL du schéma myzapp...");
    await client.connect();
    
    // Ensure schema
    await client.query("CREATE SCHEMA IF NOT EXISTS myzapp;");

    // Ensure User table
    await client.query(`
      CREATE TABLE IF NOT EXISTS myzapp."User" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT UNIQUE NOT NULL,
        "phone" TEXT,
        "password" TEXT NOT NULL,
        "isVerified" BOOLEAN NOT NULL DEFAULT false,
        "otpCode" TEXT,
        "otpExpires" TIMESTAMP(3),
        "resetOtp" TEXT,
        "resetOtpExpires" TIMESTAMP(3),
        "activeSession" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure WhatsappSession table
    await client.query(`
      CREATE TABLE IF NOT EXISTS myzapp."WhatsappSession" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "sessionString" TEXT NOT NULL,
        "phone" TEXT,
        "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
        "lastConnected" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "WhatsappSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES myzapp."User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // Ensure bot_variables table
    await client.query(`
      CREATE TABLE IF NOT EXISTS myzapp."bot_variables" (
        "id" SERIAL PRIMARY KEY,
        "key" VARCHAR(255) UNIQUE NOT NULL,
        "value" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Toutes les tables myzapp sont prêtes et opérationnelles !");
    await client.end();
  } catch (err) {
    console.error("Erreur lors de l'initialisation DB :", err);
    process.exit(0); // Don't fail build if offline
  }
}

initDB();
