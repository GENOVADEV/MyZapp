// src/contexts/AuthContext.tsx
"use client"; // Indispensable car les Contexts React fonctionnent uniquement côté client

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authService, LoginCredentials, RegisterCredentials, UserDTO } from "@/services/auth/authService";

// ============================================================================
// TYPAGE DU CONTEXTE
// ============================================================================

interface AuthContextType {
  user: UserDTO | null;
  isAuthenticated: boolean;
  isLoading: boolean; // Très utile pour afficher des "spinners" pendant le chargement
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterCredentials) => Promise<void>;
  logout: () => void;
}

// Initialisation du contexte
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// COMPOSANT FOURNISSEUR (PROVIDER)
// ============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  // 1. Au chargement de l'application, on vérifie si l'utilisateur est déjà connecté
  useEffect(() => {
    const checkSession = () => {
      try {
        const storedToken = localStorage.getItem("myzapp_token");
        const storedUser = localStorage.getItem("myzapp_user");

        if (storedToken && storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error("Erreur lors de la restauration de la session:", error);
        // En cas de données corrompues, on nettoie
        localStorage.removeItem("myzapp_token");
        localStorage.removeItem("myzapp_user");
      } finally {
        setIsLoading(false); // Le chargement initial est terminé
      }
    };

    checkSession();
  }, []);

  // 2. Fonction de connexion
  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      
      if (response.success && response.token && response.user) {
        // On sauvegarde le token et les infos utilisateur dans le navigateur
        localStorage.setItem("myzapp_token", response.token);
        localStorage.setItem("myzapp_user", JSON.stringify(response.user));
        
        setUser(response.user);
        router.push("/dashboard"); // Redirection vers le tableau de bord
      } else {
        throw new Error(response.message || "Erreur de connexion");
      }
    } catch (error) {
      throw error; // On renvoie l'erreur pour l'afficher sur la page de login
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Fonction d'inscription
  const register = async (data: RegisterCredentials) => {
    setIsLoading(true);
    try {
      const response = await authService.register(data);
      
      if (response.success) {
        // Après l'inscription, on peut soit connecter l'utilisateur directement, 
        // soit le renvoyer vers la page de connexion. Ici, on va vers le login.
        router.push("/login?registered=true");
      } else {
        throw new Error(response.message || "Erreur lors de l'inscription");
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Fonction de déconnexion
  const logout = () => {
    localStorage.removeItem("myzapp_token");
    localStorage.removeItem("myzapp_user");
    setUser(null);
    router.push("/login"); // On le renvoie à l'accueil ou au login
  };

  // Les valeurs exposées à toute l'application
  const value = {
    user,
    isAuthenticated: !!user, // true si user existe, false sinon
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// HOOK PERSONNALISÉ (Pour utiliser le contexte facilement)
// ============================================================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
  }
  return context;
}