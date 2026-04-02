// src/lib/permissions/planConfig.ts

// 1. On définit strictement à quoi ressemble une limite pour éviter les bugs
export interface PlanLimits {
  // Messages & Communication
  maxScheduledMessagesPerDay: number;
  canUseAudioTranscription: boolean;
  canUseAutoTranslation: boolean;
  maxTranslationLanguages: number;
  editMessageWindowMinutes: number; // Temps max pour modifier un message
  
  // Confidentialité
  canHideTyping: boolean; // Masquer "en train d'écrire"
  canLockChats: boolean;
  
  // Médias
  maxFileSizeMB: number;
  canSendOriginalQuality: boolean; // Photos/Vidéos sans compression
  
  // Équipes & Groupes
  maxTeamMembers: number;
  maxGroupMembers: number;
  canUseAIModeration: boolean;
  MAX_SESSIONS_PER_USER: number; // Limite de sessions WhatsApp actives par utilisateur 
  
  // Monétisation
  adsEnabled: boolean; // Doit regarder des pubs pour débloquer des actions "Pro"
}

// 2. On mappe ces limites avec l'Enum `Plan` de ton schéma Prisma
export const PLAN_LIMITS: Record<string, PlanLimits> = {
  FREE: {
    maxScheduledMessagesPerDay: 0,
    canUseAudioTranscription: false,
    canUseAutoTranslation: false,
    maxTranslationLanguages: 0,
    editMessageWindowMinutes: 0,
    canHideTyping: false,
    canLockChats: false,
    maxFileSizeMB: 100, // Limite WhatsApp standard
    canSendOriginalQuality: false,
    maxTeamMembers: 1,
    maxGroupMembers: 50,
    canUseAIModeration: false,
    adsEnabled: true, // Le mode gratuit a des pubs/récompenses
    MAX_SESSIONS_PER_USER:1,
  },
  YOUNG: {
    maxScheduledMessagesPerDay: 5,
    canUseAudioTranscription: true,
    canUseAutoTranslation: true,
    maxTranslationLanguages: 3,
    editMessageWindowMinutes: 15,
    canHideTyping: false, // Comme demandé dans ton tableau
    canLockChats: true,
    maxFileSizeMB: 500,
    canSendOriginalQuality: true, // "Photos HD"
    maxTeamMembers: 1,
    maxGroupMembers: 100,
    canUseAIModeration: false,
    adsEnabled: false,
    MAX_SESSIONS_PER_USER:5,
  },
  AGENT: {
    maxScheduledMessagesPerDay: Infinity, // Illimité
    canUseAudioTranscription: true,
    canUseAutoTranslation: true,
    maxTranslationLanguages: Infinity,
    editMessageWindowMinutes: Infinity,
    canHideTyping: true,
    canLockChats: true,
    maxFileSizeMB: 2048, // 2 GB
    canSendOriginalQuality: true,
    maxTeamMembers: 1,
    maxGroupMembers: 256,
    canUseAIModeration: false,
    adsEnabled: false,
    MAX_SESSIONS_PER_USER: 17,
  },
  BUSINESS: {
    maxScheduledMessagesPerDay: Infinity,
    canUseAudioTranscription: true,
    canUseAutoTranslation: true,
    maxTranslationLanguages: Infinity,
    editMessageWindowMinutes: Infinity,
    canHideTyping: true,
    canLockChats: true,
    maxFileSizeMB: 5120, // 5 GB
    canSendOriginalQuality: true,
    maxTeamMembers: 10,
    maxGroupMembers: 500,
    canUseAIModeration: true,
    adsEnabled: false,
    MAX_SESSIONS_PER_USER: 50,
  },
  PRO: {
    maxScheduledMessagesPerDay: Infinity,
    canUseAudioTranscription: true,
    canUseAutoTranslation: true,
    maxTranslationLanguages: Infinity,
    editMessageWindowMinutes: Infinity,
    canHideTyping: true,
    canLockChats: true,
    maxFileSizeMB: Infinity,
    canSendOriginalQuality: true,
    maxTeamMembers: Infinity,
    maxGroupMembers: Infinity,
    canUseAIModeration: true,
    adsEnabled: false,
    MAX_SESSIONS_PER_USER: Infinity,
  }
};

/**
 * Fonction utilitaire (Le fameux Gardien)
 * @param userPlan Le forfait de l'utilisateur (issu de la BDD)
 * @returns Les limites associées à ce forfait
 */
export function getUserLimits(userPlan: string): PlanLimits {
  // Si le plan n'existe pas (erreur), on retourne le plan FREE par sécurité
  return PLAN_LIMITS[userPlan] || PLAN_LIMITS.FREE;
}