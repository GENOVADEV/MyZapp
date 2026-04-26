// src/services/auth/authService.ts
import { User } from "@prisma/client"; 

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  phone?: string; 
}

export interface AuthResponse {
  success: boolean;
  message?: string;
}

export const authService = {
  /**
   * Inscrit un nouvel utilisateur dans la base de données (Credentials)
   */
  register: async (userData: RegisterCredentials): Promise<AuthResponse> => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erreur lors de l'inscription");
      
      return { success: true, message: data.message };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },
};