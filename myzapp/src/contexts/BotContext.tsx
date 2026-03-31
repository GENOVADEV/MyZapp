"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";

import { useWhatsAppConnection } from "@/hooks/useWhatsAppConnection";
import { useUserSync } from "@/hooks/useUserSync";
import { useContacts } from "@/hooks/useContacts";
import { useConversations } from "@/hooks/useConversations";

// ============================================================================
// TYPES
// ============================================================================

export type BotStatus =
  | "disconnected"
  | "connecting"
  | "qr_pending"
  | "connected"
  | "error";

interface SyncProgress {
  type: "user" | "contacts" | "conversations";
  status: "pending" | "in_progress" | "completed" | "error";
  message?: string;
}

interface BotContextType {
  status: BotStatus;
  qrCode: string | null;
  pairingCode: string | null;
  errorMessage: string | null;
  whatsappUser: any;

  syncProgress: SyncProgress[];
  isSyncing: boolean;

  connectByQR: () => Promise<void>;
  connectByPhone: (phone: string) => Promise<void>;
  disconnect: () => void;
  resetState: () => void;

  contacts: any[];
  conversations: any[];

  sessionId: string | null;
  isConnected: boolean;
}

// ============================================================================
// CONTEXT
// ============================================================================

const BotContext = createContext<BotContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function BotProvider({ children }: { children: ReactNode }) {
  const [syncProgress, setSyncProgress] = useState<SyncProgress[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const {
    sessionId,
    status,
    qrCode,
    pairingCode,
    error,
    user,
    createSession,
    disconnect,
    isConnected,
  } = useWhatsAppConnection();

  const { syncUserData } = useUserSync();
  const { contacts, refreshContacts } = useContacts();
  const { conversations, refreshConversations } = useConversations();

  // ========================================================================
  // SYNC HELPERS
  // ========================================================================

  const updateProgress = (
    type: SyncProgress["type"],
    status: SyncProgress["status"],
    message?: string
  ) => {
    setSyncProgress((prev) => {
      const existing = prev.find((p) => p.type === type);
      if (existing) {
        return prev.map((p) =>
          p.type === type ? { ...p, status, message } : p
        );
      }
      return [...prev, { type, status, message }];
    });
  };

  // ========================================================================
  // SYNC GLOBAL (🔥 CLEAN)
  // ========================================================================

  const runFullSync = useCallback(async () => {
    if (!user) return;

    setIsSyncing(true);
    setSyncProgress([]);

    try {
      // USER
      updateProgress("user", "in_progress", "Sync utilisateur...");
      await syncUserData(user);
      updateProgress("user", "completed", "Profil synchronisé");

      // CONTACTS
      updateProgress("contacts", "in_progress", "Chargement contacts...");
      await refreshContacts();
      updateProgress(
        "contacts",
        "completed",
        `${contacts.length} contacts`
      );

      // CONVERSATIONS
      updateProgress("conversations", "in_progress", "Chargement discussions...");
      await refreshConversations();
      updateProgress(
        "conversations",
        "completed",
        `${conversations.length} conversations`
      );

    } catch (err) {
      console.error("❌ Sync error:", err);
      setSyncProgress((prev) =>
        prev.map((p) =>
          p.status === "in_progress"
            ? { ...p, status: "error", message: "Erreur" }
            : p
        )
      );
    } finally {
      setIsSyncing(false);
    }
  }, [user, syncUserData, refreshContacts, refreshConversations, contacts.length, conversations.length]);

  // ========================================================================
  // AUTO SYNC quand connecté
  // ========================================================================

  useEffect(() => {
    if (status === "connected") {
      runFullSync();
    }
  }, [status, runFullSync]);

  // ========================================================================
  // ACTIONS
  // ========================================================================

  const connectByQR = async () => {
    await createSession("qr");
  };

  const connectByPhone = async (phone: string) => {
    await createSession("phone", phone);
  };

  // ========================================================================
  // CONTEXT VALUE
  // ========================================================================

  const value: BotContextType = {
    status: convertStatus(status),
    resetState: runFullSync,
    qrCode,
    pairingCode,
    errorMessage: error,
    whatsappUser: user,

    syncProgress,
    isSyncing,

    connectByQR,
    connectByPhone,
    disconnect,

    contacts,
    conversations,

    sessionId,
    isConnected,
  };

  return <BotContext.Provider value={value}>{children}</BotContext.Provider>;
}

// ============================================================================
// HELPERS
// ============================================================================

function convertStatus(status: string): BotStatus {
  switch (status) {
    case "idle":
      return "disconnected";
    case "connecting":
      return "connecting";
    case "qr_pending":
      return "qr_pending";
    case "connected":
      return "connected";
    case "error":
      return "error";
    default:
      return "disconnected";
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useBot() {
  const context = useContext(BotContext);
  if (!context) {
    throw new Error("useBot doit être utilisé dans BotProvider");
  }
  return context;
}