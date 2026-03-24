// src/services/MyZapp/whatsappService.ts
import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { fetchApi, API_ENDPOINTS, WhatsAppWebSocketService } from "../apiConfig";

// Types étendus pour WebSocket
export interface WhatsAppAuthResponse {
  success?: boolean;
  type?: "qr" | "phone";
  qr?: string;
  code?: string;
  message?: string;
  error?: string;
  sessionId?: string; // NOUVEAU
}

export interface WhatsAppSession {
  sessionId: string;
  wsUrl: string;
  status: 'pending' | 'active' | 'connected' | 'error';
}

export const whatsappService = {
  /**
   * ANCIENNE MÉTHODE (dépréciée) - Pour rétrocompatibilité
   */
  requestQrCode: async (): Promise<WhatsAppAuthResponse> => {
    console.warn('⚠️ Méthode REST dépréciée - Utilisez WebSocket');
    return fetchApi<WhatsAppAuthResponse>(API_ENDPOINTS.auth.whatsapp, {
      method: "POST",
      body: JSON.stringify({ method: "qr" }),
    });
  },

  requestPairingCode: async (phone: string): Promise<WhatsAppAuthResponse> => {
    console.warn('⚠️ Méthode REST dépréciée - Utilisez WebSocket');
    return fetchApi<WhatsAppAuthResponse>(API_ENDPOINTS.auth.whatsapp, {
      method: "POST",
      body: JSON.stringify({ method: "phone", phone }),
    });
  },

  /**
   * NOUVELLE MÉTHODE WebSocket
   */

  // Créer une nouvelle session WebSocket
  createSession: async (userId?: string): Promise<WhatsAppSession> => {
    const response = await fetchApi<{ sessionId: string; wsUrl: string }>(
      API_ENDPOINTS.auth.wsSession,
      {
        method: "POST",
        body: JSON.stringify({ userId }),
      }
    );

    return {
      sessionId: response.sessionId,
      wsUrl: response.wsUrl,
      status: 'pending'
    };
  },

  // Initialiser la connexion WhatsApp via WebSocket
  initializeWhatsApp: (wsService: WhatsAppWebSocketService, method: 'qr' | 'phone', phone?: string) => {
    wsService.emit('init_whatsapp', {
      method,
      phone: phone?.replace(/[^0-9]/g, "")
    });
  },

  // Vérifier le statut d'une session
  getSessionStatus: async (sessionId: string) => {
    return fetchApi<{ status: string }>(
      `${API_ENDPOINTS.auth.wsSession}/${sessionId}`
    );
  },

  // Déconnecter une session
  disconnectSession: async (sessionId: string) => {
    return fetchApi<{ success: boolean }>(
      `${API_ENDPOINTS.auth.wsSession}/${sessionId}`,
      { method: "DELETE" }
    );
  },

   // Envoyer un message via WebSocket
  sendMessage: (socket: Socket, messageData: any) => {
    socket.emit('send_message', messageData);
  },

  // Obtenir le statut de la connexion
  getConnectionStatus: (socket: Socket) => {
    socket.emit('get_status');
  },

  // Forcer la déconnexion
  forceDisconnect: (socket: Socket) => {
    socket.emit('force_disconnect');
  }
};

/**
 * HOOK PERSONNALISÉ pour React (optionnel mais recommandé)
 */
export const useWhatsAppWebSocket = () => {
  const [wsService] = useState(() => new WhatsAppWebSocketService());
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Écouter les événements WhatsApp
    wsService.on('qr', (data: { qr: string }) => {
      setQrCode(data.qr);
      setStatus('connecting');
    });

    wsService.on('connected', () => {
      setStatus('connected');
      setQrCode(null);
    });

    wsService.on('error', (data: { message: string }) => {
      setError(data.message);
      setStatus('disconnected');
    });

    return () => {
      wsService.disconnect();
    };
  }, [wsService]);

  const connect = async (sessionId: string) => {
    setStatus('connecting');
    setError(null);

    try {
      await wsService.connect(sessionId);
    } catch (err) {
      setError('Failed to connect to WebSocket');
      setStatus('disconnected');
    }
  };

  const initializeWhatsApp = (method: 'qr' | 'phone', phone?: string) => {
    whatsappService.initializeWhatsApp(wsService, method, phone);
  };

  return {
    wsService,
    status,
    qrCode,
    error,
    connect,
    initializeWhatsApp,
    isConnected: wsService.isConnected()
  };
};
