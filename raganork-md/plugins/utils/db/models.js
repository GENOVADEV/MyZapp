const { DataTypes } = require("sequelize");
const config = require("../../../config");

config.sequelize.sync();

const BotUsageDB = config.sequelize.define("bot_usage", {
  sessionId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY, // Stocke uniquement la date (ex: 2026-04-20)
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  commandCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
});

// 1. Modèle des Forfaits
const PlanConfigDB = config.sequelize.define('PlanConfig', {
  id: { type: DataTypes.STRING, primaryKey: true },
  plan: { type: DataTypes.STRING, unique: true },
  displayName: { type: DataTypes.STRING },
  maxDailyCommands: { type: DataTypes.INTEGER },
  priceXaf: { type: DataTypes.INTEGER },
  priceEur: { type: DataTypes.INTEGER },
  priceUsd: { type: DataTypes.INTEGER },
  updatedAt: { type: DataTypes.DATE }
}, {
  tableName: 'plan_configs',
  timestamps: false // On dit à Sequelize de ne pas gérer les dates car Prisma s'en charge
});

// 2. Modèle des Fonctionnalités (Features)
const FeatureDB = config.sequelize.define('Feature', {
  id: { type: DataTypes.STRING, primaryKey: true },
  categoryCode: { type: DataTypes.STRING, unique: true },
  displayName: { type: DataTypes.STRING },
  description: { type: DataTypes.STRING },
  allowedPlans: { type: DataTypes.ARRAY(DataTypes.STRING) }, // Sequelize gère les tableaux PostgreSQL !
  isActive: { type: DataTypes.BOOLEAN },
  createdAt: { type: DataTypes.DATE },
  updatedAt: { type: DataTypes.DATE }
}, {
  tableName: 'features',
  timestamps: false
});

// --- FIN DES NOUVEAUX MODÈLES ---

const UserDB = config.sequelize.define("User", {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    autoIncrement: true
  },
  name: DataTypes.STRING,
  plan: {
    type: DataTypes.STRING,
    defaultValue: "FREE" // 'FREE', 'PRO', 'PREMIUM'
  }
}, {
  tableName: "User" // ⚠️ Force le nom exact de Prisma
});

const WhatsAppSessionDB = config.sequelize.define("WhatsAppSession", {
  id: {
    type: DataTypes.STRING, // Correspondra à ton 'DzOoeUY8'
    primaryKey: true
  },
  sessionId: DataTypes.STRING,
  userId: {
    type: DataTypes.STRING,
  }
}, {
  tableName: "AppWhatsAppSession" // ⚠️ Force la création de la bonne table !
});

const warnDB = config.sequelize.define("_warn", {
  chat: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  user: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: "No reason provided",
  },
  warnedBy: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

const FakeDB = config.sequelize.define("fake", {
  jid: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

// Legacy antilink table - will be removed
const antilinkDB = config.sequelize.define("antilink", {
  jid: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

// New advanced antilink system
const AntilinkConfigDB = config.sequelize.define("antilink_config", {
  jid: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
  mode: {
    type: DataTypes.ENUM("warn", "kick", "delete"),
    defaultValue: "delete",
    allowNull: false,
  },
  allowedLinks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Comma-separated list of allowed domains/patterns",
  },
  blockedLinks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Comma-separated list of blocked domains/patterns",
  },
  isWhitelist: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: "true = only allow listed links, false = block listed links",
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  customMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Custom message to send when link is detected",
  },
  updatedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

const antiSpamDB = config.sequelize.define("antispam", {
  jid: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

const PDMDB = config.sequelize.define("pdm", {
  jid: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

const antiDemote = config.sequelize.define("antidemote", {
  jid: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

const antiPromote = config.sequelize.define("antipromote", {
  jid: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

const antiBotDB = config.sequelize.define("antibot", {
  jid: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

const antiWordDB = config.sequelize.define("antiword", {
  jid: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

const WelcomeDB = config.sequelize.define("welcome", {
  jid: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

const GoodbyeDB = config.sequelize.define("goodbye", {
  jid: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

const FilterDB = config.sequelize.define("filter", {
  trigger: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  response: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  jid: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  scope: {
    type: DataTypes.ENUM("chat", "global", "dm", "group"),
    defaultValue: "chat",
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  caseSensitive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  exactMatch: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = {
  UserDB,
  WhatsAppSessionDB,
  BotUsageDB,
  PlanConfigDB,
  FeatureDB,
  warnDB,
  FakeDB,
  antilinkDB, // Legacy - will be removed
  AntilinkConfigDB,
  antiSpamDB,
  PDMDB,
  antiDemote,
  antiPromote,
  antiBotDB,
  antiWordDB,
  WelcomeDB,
  GoodbyeDB,
  FilterDB,
};
