"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";

// Types
interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

interface AuthContextType {
  // État
  user: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Méthodes
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// Création du contexte
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [error, setError] = useState<string | null>(null);

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";
  const user = session?.user || null;

  // Fonction de connexion avec NextAuth
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setError(null);

      // Utiliser signIn de NextAuth avec le provider "credentials"
      const result = await signIn("credentials", {
        email: credentials.email,
        password: credentials.password,
        redirect: false, // On gère la redirection manuellement
      });

      if (!result?.ok) {
        throw new Error(result?.error || "Erreur lors de la connexion");
      }

      // Redirection vers le dashboard
      router.push("/dashboard");
    } catch (err: any) {
      const errorMessage = err.message || "Identifiants incorrects. Veuillez réessayer.";
      setError(errorMessage);
      throw err;
    }
  }, [router]);

  // Fonction d'inscription
  const register = useCallback(async (credentials: RegisterCredentials) => {
    try {
      setError(null);

      // Appeler l'API d'inscription
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de l'inscription");
      }

      // Auto-connexion après inscription (optionnel)
      if (data.autoLogin) {
        const signInResult = await signIn("credentials", {
          email: credentials.email,
          password: credentials.password,
          redirect: false,
        });

        if (!signInResult?.ok) {
          // Redirection vers login avec message
          router.push("/login?registered=true");
          return;
        }

        router.push("/dashboard");
      } else {
        // Redirection vers login pour se connecter
        router.push("/login?registered=true");
      }
    } catch (err: any) {
      const errorMessage = err.message || "Erreur lors de l'inscription";
      setError(errorMessage);
      throw err;
    }
  }, [router]);

  // Fonction de déconnexion
  const logout = useCallback(async () => {
    try {
      // Utiliser signOut de NextAuth
      await signOut({ redirect: false });
      
      setError(null);
      router.push("/login");
    } catch (err) {
      console.error("Erreur lors de la déconnexion:", err);
    }
  }, [router]);

  // Fonction pour effacer les erreurs
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook pour utiliser le contexte
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider");
  }

  return context;
}
