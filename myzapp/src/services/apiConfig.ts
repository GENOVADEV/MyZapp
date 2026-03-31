// src/services/apiConfig.ts

import { io, Socket } from "socket.io-client";

/**
 * ========================================================================
 * CONFIG GLOBALE
 * ========================================================================
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const WS_BASE_URL =
  process.env.NODE_ENV === "production"
    ? `https://${process.env.NEXT_PUBLIC_APP_URL?.replace("https://", "")}`
    : "http://localhost:3001";

/**
 * ========================================================================
 * ENDPOINTS API (🔥 STRUCTURE PROPRE)
 * ========================================================================
 */

export const API_ENDPOINTS = {
  auth: {
    login: "/api/auth/login",
    register: "/api/auth/register",
  },

  whatsapp: {
    session: "/api/whatsapp/session",
    connect: "/api/whatsapp/connect",
    disconnect: "/api/whatsapp/disconnect",
    status: "/api/whatsapp/status",
  },

  user: {
    status: "/api/user/status",
    sync: "/api/user/sync",
  },

  bot: {
    start: "/api/bot/start",
    stop: "/api/bot/stop",
  },

  data: {
    contacts: "/api/data/contacts",
    conversations: "/api/data/conversations",
    messages: "/api/data/messages",
  },
};

/**
 * ========================================================================
 * FETCH API (AVEC AUTH AUTO)
 * ========================================================================
 */

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("auth-token")
      : null;

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const config: RequestInit = {
    ...options,
    credentials: "include",
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    const text = await response.text();
    let data;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      throw new Error(data?.message || data?.error || "Erreur API");
    }

    return data as T;

  } catch (error: any) {
    console.error(
      `[API Error] ${options.method || "GET"} ${url}:`,
      error.message
    );
    throw error;
  }
}

/**
 * ========================================================================
 * SOCKET.IO SERVICE (🔥 IMPORTANT)
 * ========================================================================
 */

export class SocketService {
  private socket: Socket | null = null;

  connect(userId: string, sessionId?: string): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("auth-token")
        : null;

    this.socket = io(WS_BASE_URL, {
      auth: {
        token,
        userId,
      },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("✅ Socket connecté");

      // 🔥 Auth automatique
      if (sessionId && userId) {
        this.socket?.emit("authenticate", {
          sessionId,
          realUserid: userId,
        });
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnect:", reason);
    });

    this.socket.on("connect_error", (err) => {
      console.error("❌ Socket error:", err.message);
    });

    return this.socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  emit(event: string, data?: any) {
    this.socket?.emit(event, data);
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string) {
    this.socket?.off(event);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

/**
 * Singleton (🔥 important pour éviter plusieurs sockets)
 */
export const socketService = new SocketService();