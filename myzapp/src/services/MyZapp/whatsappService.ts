// src/services/MyZapp/whatsappService.ts

import { Socket } from "socket.io-client";
import { fetchApi, API_ENDPOINTS } from "../apiConfig";

// ============================================================================
// TYPES
// ============================================================================

export interface WhatsAppSession {
  sessionId: string;
  status: "pending" | "connected" | "error";
}

export interface SendMessagePayload {
  to: string;
  message: string;
}

// ============================================================================
// SERVICE
// ============================================================================

export const whatsappService = {

  // --------------------------------------------------------------------------
  // SESSION MANAGEMENT (REST)
  // --------------------------------------------------------------------------

  createSession: async (): Promise<WhatsAppSession> => {
    const response = await fetchApi<{ sessionId: string }>(
      API_ENDPOINTS.whatsapp.session,
      {
        method: "POST",
      }
    );

    return {
      sessionId: response.sessionId,
      status: "pending",
    };
  },

  getSessionStatus: async (sessionId: string) => {
    return fetchApi<{ status: string }>(
      `${API_ENDPOINTS.whatsapp.session}/${sessionId}`
    );
  },

  disconnectSession: async (sessionId: string) => {
    return fetchApi<{ success: boolean }>(
      `${API_ENDPOINTS.whatsapp.session}/${sessionId}`,
      { method: "DELETE" }
    );
  },

  // --------------------------------------------------------------------------
  // SOCKET HELPERS (léger, pas de logique lourde)
  // --------------------------------------------------------------------------

  initWhatsApp: (socket: Socket, data: {
    sessionId: string;
    method: "qr" | "phone";
    phone?: string;
    userId: string;
  }) => {
    socket.emit("init_whatsapp", {
      sessionId: data.sessionId,
      method: data.method,
      phone: data.phone,
      userId: data.userId,
    });
  },

  sendMessage: (socket: Socket, payload: SendMessagePayload) => {
    socket.emit("send_message", payload);
  },

  getSessionStatusSocket: (socket: Socket, sessionId: string) => {
    socket.emit("get_session_status", { sessionId });
  },

  logout: (socket: Socket, sessionId: string) => {
    socket.emit("logout_whatsapp", { sessionId });
  },
};