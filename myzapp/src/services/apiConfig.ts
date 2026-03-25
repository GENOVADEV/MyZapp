// src/services/apiConfig.ts

/**
 * Configuration mixte REST + WebSocket
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// URL WebSocket - différent en dev/prod
export const WS_BASE_URL = process.env.NODE_ENV === 'production' 
  ? `wss://${process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '')}`
  : 'ws://localhost:3001';

export const API_ENDPOINTS = {
  auth: {
    whatsapp: "/api/users/auth/myzapplogin",
    login: "/api/users/auth/login",
    register: "/api/users/auth/register",
    // NOUVEAU : Endpoint pour initialiser une session WebSocket
    wsSession: "/api/whatsapp/session", 
  },
  users: {
    profile: "/api/users/profile",
    settings: "/api/users/settings",
  },
  bot: {
    status: "/api/bot/users/whatsapp-status",
    start: "/api/bot/users/start",
    stop: "/api/bot/users/stop",
  }
};

/**
 * Fonction REST classique (pour les endpoints non-temps réel)
 */
export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || "Erreur lors de la requête.");
    }

    return data as T;
  } catch (error: any) {
    console.error(`[API Error] ${options.method || 'GET'} ${url} :`, error.message);
    throw error;
  }
}

/**
 * NOUVEAU : Service WebSocket pour WhatsApp
 */
export class WhatsAppWebSocketService {
  private socket: WebSocket | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(private wsUrl: string = WS_BASE_URL) {}

  // Se connecter au serveur WebSocket
  async connect(sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(`${this.wsUrl}?sessionId=${sessionId}`);
      
      this.socket.onopen = () => {
        console.log('WebSocket connected');
        resolve();
      };
      
      this.socket.onerror = (error) => {
        reject(new Error('WebSocket connection failed'));
      };
      
      this.socket.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };
    });
  }

  // Émettre un événement vers le serveur
  emit(event: string, data: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ event, data }));
    }
  }

  // S'abonner aux événements du serveur
  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  // Gérer les messages entrants
  private handleMessage(message: any) {
    const handlers = this.eventHandlers.get(message.type) || [];
    handlers.forEach(handler => handler(message.data));
  }

  // Déconnexion
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  // Vérifier l'état de connexion
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}
