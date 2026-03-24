// src/services/auth/authService.ts
import { fetchApi, API_ENDPOINTS } from "../apiConfig";
import {User} from "@/types/index"
// ============================================================================
// TYPES & INTERFACES (Pour un typage strict avec TypeScript)
// ============================================================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email?: string;
  password: string;
  phone: string; 
}

export interface UserDTO {
  id: User['id'];
  email: User['email'];
  emailVerified: User['emailVerified'];
  name: User['name'] | null;
  username: User['username'];
  phone: User['phone'];
  phoneVerified: User['phoneVerified'];
  image: User['image'] | null | undefined;
  password: User['password'];
  language: User['language'];
  theme: User['theme'];
  timezone: User['timezone'];
  twoFactorEnabled: User['twoFactorEnabled'];
  twoFactorSecret: User['twoFactorSecret'];
  lastLoginAt: User['lastLoginAt'];
  lastLoginIp: User['lastLoginIp'];
  failedLoginAttempts: User['failedLoginAttempts'];
  lockedUntil: User['lockedUntil'];
  status: User['status'];
  role: string; // Conversion de l'enum en string
  plan: User['plan'];
  planExpiresAt: User['planExpiresAt'];
  trialEndsAt: User['trialEndsAt'];
  createdAt: User['createdAt'];
  updatedAt: User['updatedAt'];
  deletedAt: User['deletedAt'];
};

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: UserDTO;
  token?: string; 
}

// ============================================================================
// SERVICE D'AUTHENTIFICATION
// ============================================================================

export const authService = {
  /**
   * Connecte un utilisateur existant
   * @param credentials L'email et le mot de passe de l'utilisateur
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    return fetchApi<AuthResponse>(API_ENDPOINTS.auth.login, {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  /**
   * Inscrit un nouvel utilisateur dans la base de données
   * @param userData Les informations du nouvel utilisateur (nom, email, mot de passe)
   */
  register: async (userData: RegisterCredentials): Promise<AuthResponse> => {
    return fetchApi<AuthResponse>(API_ENDPOINTS.auth.register, {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  /**
   * Déconnecte l'utilisateur actuel
   * Note : L'URL est écrite en dur ici car elle ne sert souvent qu'à détruire le cookie de session
   */
  logout: async (): Promise<{ success: boolean; message: string }> => {
    return fetchApi<{ success: boolean; message: string }>("/api/auth/logout", {
      method: "POST",
    });
  },
};