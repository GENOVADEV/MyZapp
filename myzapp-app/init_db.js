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
    console.log("Synchronisation des tables PostgreSQL du schéma myzapp...");
    await client.connect();
    
    // 1. Ensure schema
    await client.query("CREATE SCHEMA IF NOT EXISTS myzapp;");

    // 2. Ensure User table with matching schema.prisma columns
    await client.query(`
      CREATE TABLE IF NOT EXISTS myzapp."User" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT UNIQUE NOT NULL,
        "phone" TEXT,
        "passwordHash" TEXT,
        "otpCode" TEXT,
        "otpExpiry" TIMESTAMP(3),
        "isVerified" BOOLEAN NOT NULL DEFAULT false,
        "activeSession" TEXT,
        "role" TEXT NOT NULL DEFAULT 'USER',
        "botConfig" TEXT DEFAULT '{}',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Ensure all columns exist if table was previously created with older column names
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='myzapp' AND table_name='User' AND column_name='passwordHash') THEN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='myzapp' AND table_name='User' AND column_name='password') THEN
            ALTER TABLE myzapp."User" RENAME COLUMN "password" TO "passwordHash";
          ELSE
            ALTER TABLE myzapp."User" ADD COLUMN "passwordHash" TEXT;
          END IF;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='myzapp' AND table_name='User' AND column_name='otpExpiry') THEN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='myzapp' AND table_name='User' AND column_name='otpExpires') THEN
            ALTER TABLE myzapp."User" RENAME COLUMN "otpExpires" TO "otpExpiry";
          ELSE
            ALTER TABLE myzapp."User" ADD COLUMN "otpExpiry" TIMESTAMP(3);
          END IF;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='myzapp' AND table_name='User' AND column_name='role') THEN
          ALTER TABLE myzapp."User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='myzapp' AND table_name='User' AND column_name='botConfig') THEN
          ALTER TABLE myzapp."User" ADD COLUMN "botConfig" TEXT DEFAULT '{}';
        END IF;
      END $$;
    `);

    // 4. Ensure WhatsappSessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS myzapp."WhatsappSessions" (
        "sessionId" TEXT PRIMARY KEY,
        "sessionData" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Ensure bot_variables table
    await client.query(`
      CREATE TABLE IF NOT EXISTS myzapp."bot_variables" (
        "key" TEXT PRIMARY KEY,
        "value" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Toutes les colonnes de myzapp.User sont synchronisées avec schema.prisma !");
    await client.end();
  } catch (err) {
    console.error("Erreur lors de l'initialisation DB :", err);
    process.exit(0);
  }
}

initDB();
