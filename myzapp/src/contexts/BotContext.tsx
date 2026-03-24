// src/contexts/BotContext.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { useWhatsAppConnection } from "@/hooks/useWhatsAppConnection";
import { whatsappService } from "@/services/MyZapp/whatsappService";

// ============================================================================
// TYPAGE
// ============================================================================

export type BotStatus = "disconnected" | "connecting" | "qr_pending" | "connected" | "error";

interface BotContextType {
  // État de connexion
  status: BotStatus;
  qrCode: string | null;
  pairingCode: string | null;
  errorMessage: string | null;
  user: any;
  
  // Méthodes de connexion
  connectByQR: () => Promise<void>;
  connectByPhone: (phone: string) => Promise<void>;
  disconnect: () => void;
  resetState: () => void;
  
  // Informations WebSocket
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
  const [user, setUser] = useState<any>(null);

  // Utiliser le hook WebSocket personnalisé
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
    onConnected: (connectedUser) => {
      console.log('Connecté via WebSocket');
      setUser(connectedUser);
      setStatus("connected");
      setQrCode(null);
      setPairingCode(null);
      setErrorMessage(null);
    },
    onError: (error) => {
      console.error('Erreur WebSocket:', error);
      setStatus("error");
      setErrorMessage(error);
    },
    onDisconnected: (reason) => {
      console.log('Déconnecté:', reason);
      setStatus("disconnected");
      resetLocalState();
    }
  });

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

  useEffect(() => {
    setUser(wsUser);
  }, [wsUser]);

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
    setUser(null);
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

  // Déconnexion
  const disconnect = useCallback(() => {
    disconnectWs();
    resetState();
  }, [disconnectWs]);

  // Nettoyage automatique à la déconnexion
  useEffect(() => {
    return () => {
      if (socket) {
        disconnectWs();
      }
    };
  }, [socket, disconnectWs]);

  const value: BotContextType = {
    // État
    status,
    qrCode,
    pairingCode,
    errorMessage,
    user,
    
    // Méthodes
    connectByQR,
    connectByPhone,
    disconnect,
    resetState,
    
    // WebSocket
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
