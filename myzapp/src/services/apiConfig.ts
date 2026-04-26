// src/services/apiConfig.ts

/**
 * Configuration des endpoints de l'application.
 * On ne parle qu'à notre propre serveur Next.js (/api).
 * C'est Next.js qui se chargera de contacter Raganork en secret.
 */
export const API_ENDPOINTS = {
  auth: {
    login: "/api/auth/callback/credentials",
    register: "/api/auth/register",
    session: "/api/auth/session",
  },
  bot: {
    base: "/api/bot",
    status: (sessionId: string) => `/api/bot?sessionId=${sessionId}`,
    stats: "/api/bot/stats",
  },
  user: {
    profile: "/api/user/profile",
    subscription: "/api/user/subscription",
  }
};

/**
 * Un helper fetch typé pour simplifier les appels API dans ton front.
 * Il gère automatiquement le JSON et les erreurs de base.
 */
export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const defaultOptions: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  try {
    const response = await fetch(endpoint, defaultOptions);
    
    // Si la réponse n'est pas dans les 200-299
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erreur API: ${response.status}`);
    }

    // On retourne le JSON typé
    return (await response.json()) as T;
  } catch (error: any) {
    console.error(`[API Error] ${endpoint}:`, error.message);
    throw error;
  }
}