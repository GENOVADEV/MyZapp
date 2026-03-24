// src/app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2,
  Loader2,
  MessageCircle,
  Shield,
  Zap,
  ArrowRight,
  Chrome,
  Apple,
  Facebook
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext"
import { LoginCredentials } from "@/services/auth/authService";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  // États du formulaire
  const [formData, setFormData] = useState<LoginCredentials>({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Redirection si déjà authentifié
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, authLoading, router]);

  // Message de succès après inscription
  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setSuccessMessage("✓ Inscription réussie ! Connectez-vous maintenant.");
    }
    if (searchParams.get("reset") === "true") {
      setSuccessMessage("✓ Mot de passe réinitialisé ! Connectez-vous avec votre nouveau mot de passe.");
    }
  }, [searchParams]);

  // Gestion du changement des champs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null); // Efface l'erreur quand l'utilisateur tape
  };

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validation basique
    if (!formData.email || !formData.password) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError("Email invalide");
      return;
    }

    setIsLoading(true);

    try {
      await login(formData);
      // La redirection est gérée dans le AuthContext
    } catch (err: any) {
      setError(err.message || "Identifiants incorrects. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  // Connexion OAuth (placeholder)
  const handleOAuthLogin = (provider: string) => {
    // TODO: Implémenter OAuth avec NextAuth.js
    console.log(`Login avec ${provider}`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-app flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-text-subtle">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* SEO Metadata (à ajouter dans un layout ou via next/head) */}
      <div className="min-h-screen bg-gradient-to-br from-background-app via-panel to-background-app flex items-center justify-center p-4 sm:p-6 lg:p-8">
        
        {/* Fond animé */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-48 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-typing"></div>
          <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-typing" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="w-full max-w-6xl relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            
            {/* Partie Gauche - Branding & Features */}
            <div className="hidden lg:block space-y-8 animate-slide-in-left">
              
              {/* Logo & Titre */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-xl">
                    <MessageCircle className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-text-main">MyZapp</h1>
                    <p className="text-text-subtle">WhatsApp Révolutionné</p>
                  </div>
                </div>
                
                <p className="text-xl text-text-subtle leading-relaxed">
                  Connectez-vous pour accéder à des fonctionnalités exclusives et 
                  transformer votre expérience de messagerie.
                </p>
              </div>

              {/* Features */}
              <div className="space-y-4">
                {[
                  {
                    icon: <Shield className="w-5 h-5" />,
                    title: "Confidentialité Totale",
                    description: "Mode invisible, messages auto-destructibles, verrouillage par PIN"
                  },
                  {
                    icon: <Zap className="w-5 h-5" />,
                    title: "Automatisation Intelligente",
                    description: "Programmation de messages, traduction auto, transcription vocale"
                  },
                  {
                    icon: <MessageCircle className="w-5 h-5" />,
                    title: "Communication Avancée",
                    description: "Groupes illimités, sondages, appels vidéo 50 participants"
                  }
                ].map((feature, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start gap-4 p-4 bg-panel rounded-xl border border-border-main hover-lift animate-slide-up"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-main mb-1">{feature.title}</h3>
                      <p className="text-sm text-text-subtle">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border-main">
                {[
                  { value: "50K+", label: "Utilisateurs" },
                  { value: "4.9", label: "Note App" },
                  { value: "20+", label: "Fonctionnalités" }
                ].map((stat, idx) => (
                  <div key={idx} className="text-center">
                    <div className="text-2xl font-bold text-primary">{stat.value}</div>
                    <div className="text-xs text-text-subtle">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Partie Droite - Formulaire de Connexion */}
            <div className="w-full animate-slide-in-right">
              <div className="panel-card p-8 sm:p-10 rounded-2xl shadow-2xl border-2 border-border-main">
                
                {/* Header du formulaire */}
                <div className="text-center mb-8">
                  <div className="lg:hidden w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-text-main mb-2">
                    Bon retour !
                  </h2>
                  <p className="text-text-subtle">
                    Connectez-vous pour continuer sur MyZapp
                  </p>
                </div>

                {/* Messages de succès/erreur */}
                {successMessage && (
                  <div className="mb-6 p-4 bg-accent/10 border border-accent/30 rounded-lg flex items-start gap-3 animate-slide-up">
                    <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-accent">{successMessage}</p>
                  </div>
                )}

                {error && (
                  <div className="mb-6 p-4 bg-error/10 border border-error/30 rounded-lg flex items-start gap-3 animate-shake">
                    <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-error">{error}</p>
                  </div>
                )}

                {/* Formulaire */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* Email */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-sm font-semibold text-text-main">
                      Adresse Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="w-5 h-5 text-text-subtle" />
                      </div>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="input-whatsapp w-full pl-12 pr-4 py-3 text-base"
                        placeholder="vous@exemple.com"
                        required
                        autoComplete="email"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Mot de passe */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="password" className="block text-sm font-semibold text-text-main">
                        Mot de passe
                      </label>
                      <Link 
                        href="/forgot-password" 
                        className="text-sm text-primary hover:text-primary-darker transition-colors"
                      >
                        Mot de passe oublié ?
                      </Link>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="w-5 h-5 text-text-subtle" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="input-whatsapp w-full pl-12 pr-12 py-3 text-base"
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-subtle hover:text-text-main transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Remember me */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="remember"
                      className="w-4 h-4 text-primary border-border-main rounded focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    />
                    <label htmlFor="remember" className="ml-2 text-sm text-text-main">
                      Se souvenir de moi
                    </label>
                  </div>

                  {/* Bouton de soumission */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary w-full py-4 text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Connexion en cours...
                      </>
                    ) : (
                      <>
                        Se connecter
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>

                {/* Séparateur */}
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border-main"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-panel text-text-subtle">Ou continuer avec</span>
                  </div>
                </div>

                {/* Boutons OAuth */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleOAuthLogin("google")}
                    className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-border-main rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                    disabled={isLoading}
                  >
                    <Chrome className="w-5 h-5 text-text-subtle group-hover:text-primary transition-colors" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOAuthLogin("apple")}
                    className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-border-main rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                    disabled={isLoading}
                  >
                    <Apple className="w-5 h-5 text-text-subtle group-hover:text-primary transition-colors" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOAuthLogin("facebook")}
                    className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-border-main rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                    disabled={isLoading}
                  >
                    <Facebook className="w-5 h-5 text-text-subtle group-hover:text-primary transition-colors" />
                  </button>
                </div>

                {/* Lien vers inscription */}
                <div className="mt-8 text-center text-sm">
                  <span className="text-text-subtle">Vous n'avez pas de compte ? </span>
                  <Link 
                    href="/register" 
                    className="text-primary hover:text-primary-darker font-semibold transition-colors"
                  >
                    Créer un compte gratuitement
                  </Link>
                </div>

                {/* Trust badges */}
                <div className="mt-8 pt-6 border-t border-border-main">
                  <div className="flex items-center justify-center gap-6 text-xs text-text-subtle">
                    <div className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      <span>Connexion sécurisée</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>Chiffrement SSL</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lien retour accueil (mobile) */}
              <div className="mt-6 text-center lg:hidden">
                <Link 
                  href="/" 
                  className="text-sm text-text-subtle hover:text-primary transition-colors inline-flex items-center gap-2"
                >
                  ← Retour à l'accueil
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
