// src/contexts/BotContext.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { useWhatsAppConnection } from "@/hooks/useWhatsAppConnection";
import { useUserSync, useWhatsAppStatus } from "@/hooks/useUserSync";
import { useContacts } from "@/hooks/useContacts";
import { useConversations } from "@/hooks/useConversations";

// ============================================================================
// TYPAGE
// ============================================================================

export type BotStatus = "disconnected" | "connecting" | "qr_pending" | "connected" | "error";

interface SyncProgress {
  type: 'user' | 'contacts' | 'conversations' | 'messages';
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress?: number;
  total?: number;
  message?: string;
}

interface BotContextType {
  // État de connexion WhatsApp
  status: BotStatus;
  qrCode: string | null;
  pairingCode: string | null;
  errorMessage: string | null;
  whatsappUser: any;

  // Synchronisation des données
  syncProgress: SyncProgress[];
  isSyncing: boolean;
  syncStats: {
    contacts: number;
    conversations: number;
    messages: number;
  };

  // Méthodes de connexion
  connectByQR: () => Promise<void>;
  connectByPhone: (phone: string) => Promise<void>;
  disconnect: () => void;
  resetState: () => void;

  // Méthodes de synchronisation
  syncUserData: (whatsappUser: any) => Promise<any>;
  getWhatsAppStatus: () => Promise<any>;
  disconnectWhatsApp: () => Promise<any>;

  // Gestion des contacts et conversations
  contacts: any[];
  conversations: any[];
  refreshContacts: () => Promise<void>;
  refreshConversations: () => Promise<void>;

  // Informations techniques
  sessionId: string | null;
  isConnected: boolean;
  socket: any;
}

const BotContext = createContext<BotContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function BotProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<BotStatus>("disconnected");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [whatsappUser, setWhatsappUser] = useState<any>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStats, setSyncStats] = useState({
    contacts: 0,
    conversations: 0,
    messages: 0
  });

  // Utiliser les hooks personnalisés
  const {
    socket,
    sessionId,
    status: wsStatus,
    qrCode: wsQrCode,
    error: wsError,
    user: wsUser,
    createSession,
    disconnect: disconnectWs,
    isConnected: wsConnected
  } = useWhatsAppConnection({
    onQrReceived: (qr) => {
      console.log('QR reçu via WebSocket');
      setQrCode(qr);
      setStatus("qr_pending");
    },
    onPairingCodeReceived(code, phone) {
      console.log('Code de jumelage reçu via WebSocket');
      setPairingCode(code);
      setStatus("connecting");
    },
    onConnected: (connectedUser) => {
      console.log('Connecté via WebSocket');
      handleWhatsAppConnected(connectedUser);
    },
    onError: (error) => {
      console.error('Erreur WebSocket:', error);
      setStatus("error");
      setErrorMessage(error);
      setIsSyncing(false);
    },
    onDisconnected: (reason) => {
      console.log('Déconnecté:', reason);
      setStatus("disconnected");
      setIsSyncing(false);
      resetLocalState();
    }
  });

  // Hook de synchronisation utilisateur
  const { syncUserData, disconnectWhatsApp } = useUserSync();
  const getWhatsAppStatus = async () => {
    const res = await fetch('/api/bot/users/whatsapp-status');
    return res.json();
  };

  // Hooks pour les données (à implémenter)
  const { contacts, refreshContacts: refetchContacts } = useContacts();

  const refreshContacts = async (): Promise<void> => {
    await refetchContacts();
  };

  const { conversations, refreshConversations: refetchConversations } = useConversations();

  const refreshConversations = async (): Promise<void> => {
    await refetchConversations();
  };
  // Gestion de la connexion WhatsApp réussie
  const handleWhatsAppConnected = async (connectedUser: any) => {
    setWhatsappUser(connectedUser);
    setStatus("connected");
    setQrCode(null);
    setPairingCode(null);
    setErrorMessage(null);

    // Démarrer la synchronisation des données
    await startDataSync(connectedUser);
  };

  // Démarrer la synchronisation des données
  const startDataSync = async (userData: any) => {
    setIsSyncing(true);
    setSyncProgress([]);

    try {
      // 1. Synchroniser les données utilisateur
      updateSyncProgress('user', 'in_progress', 'Synchronisation du profil...');
      const userResult = await syncUserData(userData);
      updateSyncProgress('user', 'completed', 'Profil synchronisé');

      // 2. Synchroniser les contacts (via WebSocket - géré automatiquement)
      updateSyncProgress('contacts', 'pending', 'En attente des contacts...');

      // 3. Synchroniser les conversations (via WebSocket - géré automatiquement)
      updateSyncProgress('conversations', 'pending', 'En attente des conversations...');

      // 4. Attendre un peu et rafraîchir les données
      setTimeout(async () => {
        try {
          await refreshContacts();
          await refreshConversations();

          // Mettre à jour les statistiques
          setSyncStats({
            contacts: contacts.length,
            conversations: conversations.length,
            messages: 0 // À implémenter
          });

          updateSyncProgress('contacts', 'completed', `${contacts.length} contacts synchronisés`);
          updateSyncProgress('conversations', 'completed', `${conversations.length} conversations synchronisées`);

        } catch (error) {
          console.error('Erreur rafraîchissement données:', error);
          updateSyncProgress('contacts', 'error', 'Erreur synchronisation contacts');
          updateSyncProgress('conversations', 'error', 'Erreur synchronisation conversations');
        } finally {
          setIsSyncing(false);
        }
      }, 2000);

    } catch (error) {
      console.error('Erreur synchronisation données:', error);
      setIsSyncing(false);
      setSyncProgress(prev => prev.map(p =>
        p.status === 'in_progress' ? { ...p, status: 'error', message: 'Erreur de synchronisation' } : p
      ));
    }
  };

  // Mettre à jour la progression de synchronisation
  const updateSyncProgress = (type: SyncProgress['type'], status: SyncProgress['status'], message?: string) => {
    setSyncProgress(prev => {
      const existing = prev.find(p => p.type === type);
      if (existing) {
        return prev.map(p => p.type === type ? { ...p, status, message } : p);
      } else {
        return [...prev, { type, status, message }];
      }
    });
  };

  // Synchroniser l'état local avec le hook WebSocket
  useEffect(() => {
    setStatus(convertWsStatus(wsStatus));
  }, [wsStatus]);

  useEffect(() => {
    setQrCode(wsQrCode);
  }, [wsQrCode]);

  useEffect(() => {
    setErrorMessage(wsError);
  }, [wsError]);

  // Convertir le statut WebSocket en statut BotContext
  const convertWsStatus = (wsStatus: string): BotStatus => {
    switch (wsStatus) {
      case 'idle': return 'disconnected';
      case 'connecting': return 'connecting';
      case 'qr_pending': return 'qr_pending';
      case 'connected': return 'connected';
      case 'error': return 'error';
      default: return 'disconnected';
    }
  };

  // Remettre à zéro l'état local
  const resetLocalState = () => {
    setQrCode(null);
    setPairingCode(null);
    setErrorMessage(null);
    setWhatsappUser(null);
    setSyncProgress([]);
    setIsSyncing(false);
    setSyncStats({ contacts: 0, conversations: 0, messages: 0 });
  };

  const resetState = () => {
    resetLocalState();
    setStatus("disconnected");
    if (socket) {
      disconnectWs();
    }
  };

  // 1. Connexion par QR Code via WebSocket
  const connectByQR = async () => {
    try {
      resetLocalState();
      setStatus("connecting");

      await createSession('qr');

    } catch (error: any) {
      setStatus("error");
      setErrorMessage(error.message || "Impossible de démarrer la connexion WebSocket.");
    }
  };

  // 2. Connexion par code de jumelage via WebSocket
  const connectByPhone = async (phone: string) => {
    try {
      resetLocalState();
      setStatus("connecting");

      await createSession('phone', phone);

    } catch (error: any) {
      setStatus("error");
      setErrorMessage(error.message || "Impossible de démarrer la connexion WebSocket.");
    }
  };

  // Déconnexion WhatsApp
  const disconnect = useCallback(async () => {
    try {
      // Déconnecter de l'application
      await disconnectWhatsApp();
    } catch (error) {
      console.error('Erreur déconnexion application:', error);
    } finally {
      // Déconnecter WebSocket
      disconnectWs();
      resetState();
    }
  }, [disconnectWs, disconnectWhatsApp]);

  // Vérifier le statut WhatsApp au chargement
  useEffect(() => {
    const checkWhatsAppStatus = async () => {
      try {
        const status = await getWhatsAppStatus();
        if (status.connected) {
          setStatus("connected");
          setWhatsappUser({ id: status.whatsappId });
        }
      } catch (error) {
        console.error('Erreur vérification statut WhatsApp:', error);
      }
    };

    checkWhatsAppStatus();
  }, []);

  // Nettoyage automatique
  useEffect(() => {
    return () => {
      if (socket) {
        disconnectWs();
      }
    };
  }, [socket, disconnectWs]);

  const value: BotContextType = {
    // État de connexion
    status,
    qrCode,
    pairingCode,
    errorMessage,
    whatsappUser,

    // Synchronisation
    syncProgress,
    isSyncing,
    syncStats,

    // Méthodes de connexion
    connectByQR,
    connectByPhone,
    disconnect,
    resetState,

    // Méthodes de synchronisation
    syncUserData,
    getWhatsAppStatus,
    disconnectWhatsApp,

    // Données
    contacts,
    conversations,
    refreshContacts,
    refreshConversations,

    // Informations techniques
    sessionId,
    isConnected: wsConnected,
    socket
  };

  return <BotContext.Provider value={value}>{children}</BotContext.Provider>;
}

// ============================================================================
// HOOK PERSONNALISÉ
// ============================================================================

export function useBot() {
  const context = useContext(BotContext);
  if (context === undefined) {
    throw new Error("useBot doit être utilisé à l'intérieur d'un BotProvider");
  }
  return context;
}
