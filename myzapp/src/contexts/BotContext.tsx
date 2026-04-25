// src/contexts/BotContext.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { fetchApi, API_ENDPOINTS } from "@/services/apiConfig";

// ============================================================================
// TYPES
// ============================================================================
export type BotStatus = "online" | "offline" | "loading" | "error";

// 📊 1. On définit le type de nos statistiques
export interface BotStats {
  commands: { total: number; today: number };
  filters: number;
  antilinks: number;
  warnings: number;
  messages: {
    total: number;
    text: number;
    image: number;
    video: number;
    audio: number;
    sticker: number;
    other: number;
  };
}

export interface BotContextType {
  status: BotStatus;
  isOnline: boolean;
  error: string | null;
  sessionId: string | null;
  stats: BotStats | null; // 👈 Les stats sont maintenant disponibles globalement
  
  // Actions
  startBot: () => Promise<void>;
  stopBot: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  refreshStats: () => Promise<void>; // 👈 Nouvelle action
  clearError: () => void;
}

const BotContext = createContext<BotContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================
export function BotProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  
  const [status, setStatus] = useState<BotStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<BotStats | null>(null); // 👈 L'état local des stats

  // On génère l'ID de session WhatsApp basé sur l'ID de l'utilisateur NextAuth
  const sessionId = session?.user?.id ? `bot_${(session.user as any).id}` : null;

  // 🔄 Fonction pour vérifier le statut réel du bot
  const refreshStatus = useCallback(async () => {
    if (!sessionId) return;

    try {
      const data = await fetchApi<{ status: string }>(API_ENDPOINTS.bot.status(sessionId));
      
      if (data.status === "online") {
        setStatus("online");
      } else {
        setStatus("offline");
      }
      setError(null);
    } catch (err: any) {
      console.error("Erreur statut bot:", err);
      setStatus("error");
      setError(err.message || "Impossible de joindre le serveur Raganork");
    }
  }, [sessionId]);

  // 📊 NOUVEAU : Fonction pour récupérer les stats du bot
  const refreshStats = useCallback(async () => {
    if (!sessionId) return; // S'il n'y a pas de session, pas de stats à charger

    try {
      const data = await fetchApi<BotStats>(API_ENDPOINTS.bot.stats);
      setStats(data);
    } catch (err: any) {
      console.error("Erreur de récupération des stats:", err);
    }
  }, [sessionId]);

  // 🕒 Vérification automatique au chargement et intervalles
  useEffect(() => {
    if (!sessionId) {
      setStatus("offline");
      setStats(null);
      return;
    }

    refreshStatus();
    refreshStats(); // 👈 On charge les stats au lancement

    const statusInterval = setInterval(refreshStatus, 15000); // Polling statut toutes les 15s
    const statsInterval = setInterval(refreshStats, 30000);   // Polling stats toutes les 30s (évite de surcharger la BDD)

    return () => {
      clearInterval(statusInterval);
      clearInterval(statsInterval);
    };
  }, [sessionId, refreshStatus, refreshStats]);

  // 🚀 Démarrer le bot
  const startBot = useCallback(async () => {
    if (!sessionId) return;
    try {
      setError(null);
      setStatus("loading");

      const res = await fetchApi(API_ENDPOINTS.bot.base, {
        method: "POST",
        body: JSON.stringify({ action: "start", sessionId }),
      });

      console.log("Demarrage du bot:", res);
      setStatus("online")

      setTimeout(() => {
        refreshStatus();
        refreshStats(); // Met à jour les stats après démarrage
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Erreur lors du démarrage");
      setStatus("error");
    }
  }, [sessionId, refreshStatus, refreshStats]);

  // 🛑 Arrêter le bot
  const stopBot = useCallback(async () => {
    if (!sessionId) return;
    try {
      setError(null);
      setStatus("loading");

      await fetchApi(API_ENDPOINTS.bot.base, {
        method: "POST",
        body: JSON.stringify({ action: "stop", sessionId }),
      });

      setStatus("offline");
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'arrêt");
      setStatus("error");
    }
  }, [sessionId]);

  const clearError = useCallback(() => setError(null), []);

  const value: BotContextType = {
    status,
    isOnline: status === "online",
    error,
    sessionId,
    stats, // 👈 On expose les stats dans le contexte
    startBot,
    stopBot,
    refreshStatus,
    refreshStats, // 👈 On expose la fonction manuelle
    clearError,
  };

  return <BotContext.Provider value={value}>{children}</BotContext.Provider>;
}

// ============================================================================
// HOOK CUSTOM
// ============================================================================
export function useBot(): BotContextType {
  const context = useContext(BotContext);
  if (context === undefined) {
    throw new Error("useBot doit être utilisé dans un BotProvider");
  }
  return context;
}