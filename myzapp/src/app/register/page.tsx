// src/app/register/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  User,
  Phone,
  Shield,
  Zap,
  ArrowRight,
  Chrome,
  Apple,
  Facebook,
  Check,
  X,
  Gift,
  Crown,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { RegisterCredentials } from "@/services/auth/authService";

// Critères de validation du mot de passe
const PASSWORD_CRITERIA = [
  { id: "length", label: "Au moins 8 caractères", test: (pwd: string) => pwd.length >= 8 },
  { id: "uppercase", label: "Une majuscule", test: (pwd: string) => /[A-Z]/.test(pwd) },
  { id: "lowercase", label: "Une minuscule", test: (pwd: string) => /[a-z]/.test(pwd) },
  { id: "number", label: "Un chiffre", test: (pwd: string) => /[0-9]/.test(pwd) },
  { id: "special", label: "Un caractère spécial", test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();

  // États du formulaire
  const [formData, setFormData] = useState<RegisterCredentials>({
    name: "",
    email: "",
    password: "",
    phone: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedMarketing, setAcceptedMarketing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // Multi-step form

  // Validation en temps réel
  const [validations, setValidations] = useState({
    name: false,
    email: false,
    phone: false,
    password: false,
    confirmPassword: false,
  });

  // Redirection si déjà authentifié
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, authLoading, router]);

  // Validation du nom
  useEffect(() => {
    setValidations(prev => ({
      ...prev,
      name: formData.name.length >= 2
    }));
  }, [formData.name]);

  // Validation de l'email
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setValidations(prev => ({
      ...prev,
      email: emailRegex.test(formData.email || "")
    }));
  }, [formData.email]);

  // Validation du téléphone
  useEffect(() => {
    const phoneRegex = /^[\d\s\-\+\(\)]{8,}$/;
    setValidations(prev => ({
      ...prev,
      phone: phoneRegex.test(formData.phone)
    }));
  }, [formData.phone]);

  // Validation du mot de passe
  useEffect(() => {
    const allCriteriaMet = PASSWORD_CRITERIA.every(criteria => criteria.test(formData.password));
    setValidations(prev => ({
      ...prev,
      password: allCriteriaMet
    }));
  }, [formData.password]);

  // Validation de la confirmation du mot de passe
  useEffect(() => {
    setValidations(prev => ({
      ...prev,
      confirmPassword: confirmPassword.length > 0 && confirmPassword === formData.password
    }));
  }, [confirmPassword, formData.password]);

  // Gestion du changement des champs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  // Vérification si on peut passer à l'étape suivante
  const canProceedToStep2 = validations.name && validations.phone;
  const canProceedToStep3 = validations.email;
  const canSubmit = Object.values(validations).every(v => v) && acceptedTerms;

  // Navigation entre les étapes
  const nextStep = () => {
    if (currentStep === 1 && !canProceedToStep2) {
      setError("Veuillez remplir correctement votre nom et téléphone");
      return;
    }
    if (currentStep === 2 && !canProceedToStep3) {
      setError("Veuillez entrer une adresse email valide");
      return;
    }
    setError(null);
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setError(null);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations finales
    if (!canSubmit) {
      setError("Veuillez remplir tous les champs correctement");
      return;
    }

    if (!acceptedTerms) {
      setError("Vous devez accepter les conditions d'utilisation");
      return;
    }

    setIsLoading(true);

    try {
      await register(formData);
      // La redirection est gérée dans le AuthContext
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  // Connexion OAuth (placeholder)
  const handleOAuthRegister = (provider: string) => {
    // TODO: Implémenter OAuth avec NextAuth.js
    console.log(`Inscription avec ${provider}`);
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
    <div className="min-h-screen bg-gradient-to-br from-background-app via-panel to-background-app flex items-center justify-center p-4 sm:p-6 lg:p-8">
      
      {/* Fond animé */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-typing"></div>
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-typing" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse-typing" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          
          {/* Partie Gauche - Avantages & Offre */}
          <div className="hidden lg:block space-y-8 animate-slide-in-left">
            
            {/* Logo & Titre */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-xl">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-text-main">MyZapp</h1>
                  <p className="text-text-subtle">Rejoignez la révolution</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-accent/20 to-primary/20 p-4 rounded-xl border-l-4 border-accent">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="w-5 h-5 text-accent" />
                  <span className="font-bold text-accent">Offre de lancement</span>
                </div>
                <p className="text-sm text-text-main">
                  <strong>14 jours d'essai gratuit</strong> sur tous nos forfaits + <strong>40% de réduction</strong> la première année !
                </p>
              </div>
            </div>

            {/* Avantages clés */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-text-main flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                Pourquoi choisir MyZapp ?
              </h3>
              
              {[
                {
                  icon: <Crown className="w-5 h-5" />,
                  title: "20+ Fonctionnalités Exclusives",
                  description: "Mode invisible, messages programmés, traduction auto, transcription vocale...",
                  color: "text-amber-500",
                  bg: "bg-amber-500/10"
                },
                {
                  icon: <Shield className="w-5 h-5" />,
                  title: "Sécurité Maximale",
                  description: "Chiffrement E2E, verrouillage biométrique, messages éphémères",
                  color: "text-blue-500",
                  bg: "bg-blue-500/10"
                },
                {
                  icon: <Zap className="w-5 h-5" />,
                  title: "Automatisation Intelligente",
                  description: "Bots personnalisés, réponses auto, workflows avancés",
                  color: "text-primary",
                  bg: "bg-primary/10"
                },
                {
                  icon: <MessageCircle className="w-5 h-5" />,
                  title: "Support Premium 24/7",
                  description: "Équipe dédiée, chat en direct, formation incluse",
                  color: "text-accent",
                  bg: "bg-accent/10"
                }
              ].map((benefit, idx) => (
                <div 
                  key={idx} 
                  className="flex items-start gap-4 p-4 bg-panel rounded-xl border border-border-main hover-lift animate-slide-up"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className={`w-10 h-10 ${benefit.bg} rounded-lg flex items-center justify-center ${benefit.color} flex-shrink-0`}>
                    {benefit.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-main mb-1">{benefit.title}</h4>
                    <p className="text-sm text-text-subtle">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Témoignage */}
            <div className="bg-panel p-6 rounded-xl border border-border-main">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-accent to-primary rounded-full"></div>
                <div>
                  <p className="font-semibold text-text-main">Sophie Martin</p>
                  <p className="text-xs text-text-subtle">Entrepreneuse</p>
                </div>
              </div>
              <p className="text-sm text-text-subtle italic">
                "MyZapp a transformé ma façon de communiquer avec mes clients. La programmation de messages et les bots m'ont fait gagner 5h par semaine !"
              </p>
              <div className="flex gap-0.5 mt-3">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-amber-500">⭐</span>
                ))}
              </div>
            </div>
          </div>

          {/* Partie Droite - Formulaire d'Inscription */}
          <div className="w-full animate-slide-in-right">
            <div className="panel-card p-8 sm:p-10 rounded-2xl shadow-2xl border-2 border-border-main">
              
              {/* Header du formulaire */}
              <div className="text-center mb-8">
                <div className="lg:hidden w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-text-main mb-2">
                  Créez votre compte
                </h2>
                <p className="text-text-subtle">
                  Essai gratuit 14 jours • Sans carte bancaire
                </p>
              </div>

              {/* Indicateur d'étapes */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center flex-1">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all
                        ${currentStep >= step 
                          ? 'bg-primary text-white' 
                          : 'bg-panel border-2 border-border-main text-text-subtle'
                        }
                      `}>
                        {currentStep > step ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          step
                        )}
                      </div>
                      {step < 3 && (
                        <div className={`
                          flex-1 h-1 mx-2 rounded-full transition-all
                          ${currentStep > step ? 'bg-primary' : 'bg-border-main'}
                        `}></div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-text-subtle">
                  <span>Identité</span>
                  <span>Email</span>
                  <span>Sécurité</span>
                </div>
              </div>

              {/* Message d'erreur global */}
              {error && (
                <div className="mb-6 p-4 bg-error/10 border border-error/30 rounded-lg flex items-start gap-3 animate-shake">
                  <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-error">{error}</p>
                </div>
              )}

              {/* Formulaire */}
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* ÉTAPE 1 : Identité */}
                {currentStep === 1 && (
                  <div className="space-y-6 animate-slide-in-right">
                    {/* Nom */}
                    <div className="space-y-2">
                      <label htmlFor="name" className="block text-sm font-semibold text-text-main">
                        Nom complet *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <User className="w-5 h-5 text-text-subtle" />
                        </div>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          className={`input-whatsapp w-full pl-12 pr-12 py-3 text-base ${
                            formData.name && (validations.name ? 'border-accent' : 'border-error')
                          }`}
                          placeholder="Jean Dupont"
                          required
                          autoComplete="name"
                        />
                        {formData.name && (
                          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                            {validations.name ? (
                              <CheckCircle2 className="w-5 h-5 text-accent" />
                            ) : (
                              <X className="w-5 h-5 text-error" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Téléphone */}
                    <div className="space-y-2">
                      <label htmlFor="phone" className="block text-sm font-semibold text-text-main">
                        Numéro de téléphone *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Phone className="w-5 h-5 text-text-subtle" />
                        </div>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className={`input-whatsapp w-full pl-12 pr-12 py-3 text-base ${
                            formData.phone && (validations.phone ? 'border-accent' : 'border-error')
                          }`}
                          placeholder="+33 6 12 34 56 78"
                          required
                          autoComplete="tel"
                        />
                        {formData.phone && (
                          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                            {validations.phone ? (
                              <CheckCircle2 className="w-5 h-5 text-accent" />
                            ) : (
                              <X className="w-5 h-5 text-error" />
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-text-subtle">
                        Nous ne partagerons jamais votre numéro
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={nextStep}
                      disabled={!canProceedToStep2}
                      className="btn-primary w-full py-4 text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continuer
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* ÉTAPE 2 : Email */}
                {currentStep === 2 && (
                  <div className="space-y-6 animate-slide-in-right">
                    <div className="space-y-2">
                      <label htmlFor="email" className="block text-sm font-semibold text-text-main">
                        Adresse Email *
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
                          className={`input-whatsapp w-full pl-12 pr-12 py-3 text-base ${
                            formData.email && (validations.email ? 'border-accent' : 'border-error')
                          }`}
                          placeholder="vous@exemple.com"
                          required
                          autoComplete="email"
                        />
                        {formData.email && (
                          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                            {validations.email ? (
                              <CheckCircle2 className="w-5 h-5 text-accent" />
                            ) : (
                              <X className="w-5 h-5 text-error" />
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-text-subtle">
                        Utilisé pour la connexion et les notifications importantes
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={prevStep}
                        className="flex-1 px-6 py-4 rounded-full border-2 border-border-main text-text-main hover:bg-panel-hover transition-all font-semibold"
                      >
                        Retour
                      </button>
                      <button
                        type="button"
                        onClick={nextStep}
                        disabled={!canProceedToStep3}
                        className="flex-1 btn-primary py-4 text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Continuer
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ÉTAPE 3 : Mot de passe & Confirmation */}
                {currentStep === 3 && (
                  <div className="space-y-6 animate-slide-in-right">
                    {/* Mot de passe */}
                    <div className="space-y-2">
                      <label htmlFor="password" className="block text-sm font-semibold text-text-main">
                        Mot de passe *
                      </label>
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
                          autoComplete="new-password"
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
                      
                      {/* Critères de mot de passe */}
                      {formData.password && (
                        <div className="mt-3 p-3 bg-panel-hover rounded-lg space-y-2">
                          <p className="text-xs font-semibold text-text-main mb-2">Votre mot de passe doit contenir :</p>
                          {PASSWORD_CRITERIA.map((criteria) => {
                            const isMet = criteria.test(formData.password);
                            return (
                              <div key={criteria.id} className="flex items-center gap-2 text-xs">
                                {isMet ? (
                                  <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                                ) : (
                                  <X className="w-4 h-4 text-text-subtle flex-shrink-0" />
                                )}
                                <span className={isMet ? 'text-accent' : 'text-text-subtle'}>
                                  {criteria.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Confirmation du mot de passe */}
                    <div className="space-y-2">
                      <label htmlFor="confirmPassword" className="block text-sm font-semibold text-text-main">
                        Confirmer le mot de passe *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="w-5 h-5 text-text-subtle" />
                        </div>
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          id="confirmPassword"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={`input-whatsapp w-full pl-12 pr-12 py-3 text-base ${
                            confirmPassword && (validations.confirmPassword ? 'border-accent' : 'border-error')
                          }`}
                          placeholder="••••••••"
                          required
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-subtle hover:text-text-main transition-colors"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      {confirmPassword && !validations.confirmPassword && (
                        <p className="text-xs text-error">Les mots de passe ne correspondent pas</p>
                      )}
                    </div>

                    {/* Conditions d'utilisation */}
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="terms"
                          checked={acceptedTerms}
                          onChange={(e) => setAcceptedTerms(e.target.checked)}
                          className="w-4 h-4 mt-0.5 text-primary border-border-main rounded focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          required
                        />
                        <label htmlFor="terms" className="text-sm text-text-main">
                          J'accepte les{" "}
                          <Link href="/terms" className="text-primary hover:text-primary-darker font-semibold">
                            Conditions d'utilisation
                          </Link>{" "}
                          et la{" "}
                          <Link href="/privacy" className="text-primary hover:text-primary-darker font-semibold">
                            Politique de confidentialité
                          </Link>
                        </label>
                      </div>

                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="marketing"
                          checked={acceptedMarketing}
                          onChange={(e) => setAcceptedMarketing(e.target.checked)}
                          className="w-4 h-4 mt-0.5 text-primary border-border-main rounded focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        />
                        <label htmlFor="marketing" className="text-sm text-text-subtle">
                          J'accepte de recevoir des conseils et offres exclusives par email (optionnel)
                        </label>
                      </div>
                    </div>

                    {/* Boutons */}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={prevStep}
                        className="flex-1 px-6 py-4 rounded-full border-2 border-border-main text-text-main hover:bg-panel-hover transition-all font-semibold"
                      >
                        Retour
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading || !canSubmit}
                        className="flex-1 btn-primary py-4 text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Création...
                          </>
                        ) : (
                          <>
                            Créer mon compte
                            <CheckCircle2 className="w-5 h-5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </form>

              {/* Séparateur (seulement à l'étape 1) */}
              {currentStep === 1 && (
                <>
                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border-main"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-panel text-text-subtle">Ou s'inscrire avec</span>
                    </div>
                  </div>

                  {/* Boutons OAuth */}
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => handleOAuthRegister("google")}
                      className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-border-main rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                      disabled={isLoading}
                    >
                      <Chrome className="w-5 h-5 text-text-subtle group-hover:text-primary transition-colors" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOAuthRegister("apple")}
                      className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-border-main rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                      disabled={isLoading}
                    >
                      <Apple className="w-5 h-5 text-text-subtle group-hover:text-primary transition-colors" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOAuthRegister("facebook")}
                      className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-border-main rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                      disabled={isLoading}
                    >
                      <Facebook className="w-5 h-5 text-text-subtle group-hover:text-primary transition-colors" />
                    </button>
                  </div>
                </>
              )}

              {/* Lien vers connexion */}
              <div className="mt-8 text-center text-sm">
                <span className="text-text-subtle">Vous avez déjà un compte ? </span>
                <Link 
                  href="/login" 
                  className="text-primary hover:text-primary-darker font-semibold transition-colors"
                >
                  Se connecter
                </Link>
              </div>

              {/* Trust badges */}
              <div className="mt-8 pt-6 border-t border-border-main">
                <div className="flex items-center justify-center gap-6 text-xs text-text-subtle">
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    <span>SSL sécurisé</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>RGPD conforme</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Sans engagement</span>
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
  );
}
