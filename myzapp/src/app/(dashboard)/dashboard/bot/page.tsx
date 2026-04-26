// src/app/dashboard/bot/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  QrCode,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Shield,
  Zap,
  MessageCircle,
  Smartphone,
  Info,
  ChevronRight,
  KeyRound,
  ExternalLink,
  Copy
} from "lucide-react";
import { useBot } from "@/contexts/BotContext";
import Link from "next/link";
import { toast } from "sonner";
import { fetchApi, API_ENDPOINTS } from "@/services/apiConfig";

type ConnectionMethod = "qr" | "phone" | null;

export default function WhatsAppConnectionPage() {
  const router = useRouter();
  const { status, refreshStatus } = useBot();

  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>(null);
  const [sessionIdInput, setSessionIdInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  // Si le bot est déjà en ligne, on redirige vers le dashboard
  useEffect(() => {
    if (status === "online") {
      router.push("/dashboard");
    }
  }, [status, router]);

  // Réinitialiser et choisir une autre méthode
  const handleReset = () => {
    setConnectionMethod(null);
    setSessionIdInput("");
    setError("");
  };

  // Lier la session à MyZapp
  const handleConnectSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionIdInput.trim() || sessionIdInput.length !== 13 || sessionIdInput.split("~")[0] !== "RGNK") {
      setError("Veuillez entrer un ID de session valide.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await fetchApi(API_ENDPOINTS.bot.base, {
        method: "POST",
        body: JSON.stringify({
          action: "start",
          sessionId: sessionIdInput.trim()
        })
      });

      toast.success("Session liée avec succès !");
      await refreshStatus();
      router.push("/dashboard");

    } catch (err: any) {
      setError(err.message || "Erreur lors de la liaison de la session.");
      toast.error("Impossible de lier cette session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">

          {/* ========================================== */}
          {/* Partie Gauche - Informations (Intacte) */}
          {/* ========================================== */}
          <div className="hidden lg:block space-y-8 animate-slide-in-left sticky top-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-xl">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-text-main">Connexion WhatsApp</h1>
                  <p className="text-text-subtle">Liez votre compte à MyZapp</p>
                </div>
              </div>
              <p className="text-lg text-text-subtle leading-relaxed">
                Connectez votre WhatsApp pour débloquer toutes les fonctionnalités d'automatisation et gérer vos règles de modération.
              </p>
            </div>

            {/* Avantages */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-text-main flex items-center gap-2">
                <Zap className="w-5 h-5 text-accent" />
                Pourquoi connecter WhatsApp ?
              </h3>

              {[
                {
                  icon: <Shield className="w-5 h-5" />,
                  title: "100% Sécurisé",
                  description: "Connexion chiffrée de bout en bout. Vos données restent privées.",
                  color: "text-blue-500",
                  bg: "bg-blue-500/10"
                },
                {
                  icon: <Zap className="w-5 h-5" />,
                  title: "Automatisation Intelligente",
                  description: "Créez des bots, configurez des anti-liens et automatisez vos réponses.",
                  color: "text-primary",
                  bg: "bg-primary/10"
                },
                {
                  icon: <Smartphone className="w-5 h-5" />,
                  title: "Bot Autonome",
                  description: "Une fois lié, le bot fonctionne même si votre téléphone est éteint.",
                  color: "text-purple-500",
                  bg: "bg-purple-500/10"
                }
              ].map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4 bg-panel rounded-xl border border-border-main hover-lift animate-slide-up" style={{ animationDelay: `${idx * 100}ms` }}>
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

            {/* Note de sécurité */}
            <div className="bg-primary/5 border-l-4 border-primary p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-text-main mb-1">Note de sécurité</h4>
                  <p className="text-sm text-text-subtle">
                    La clé de session (ID) générée ne sert qu'à maintenir le bot actif. MyZapp ne stocke jamais vos conversations personnelles.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* Partie Droite - Interface de Connexion */}
          {/* ========================================== */}
          <div className="w-full animate-slide-in-right">
            <div className="panel-card rounded-2xl shadow-2xl border-2 border-border-main overflow-hidden">

              {/* Header de la carte */}
              <div className="bg-gradient-to-br from-primary/5 to-accent/5 p-6 border-b border-border-main">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold text-text-main">
                    {!connectionMethod && "Choisissez une méthode"}
                    {connectionMethod === "qr" && "Connexion par QR Code"}
                    {connectionMethod === "phone" && "Connexion par Code de Jumelage"}
                  </h2>
                  {connectionMethod && (
                    <button onClick={handleReset} className="p-2 hover:bg-panel-hover rounded-lg transition-colors" aria-label="Retour">
                      <ArrowLeft className="w-5 h-5 text-text-subtle" />
                    </button>
                  )}
                </div>
                <p className="text-text-subtle">
                  {!connectionMethod && "Générez un ID de session en quelques secondes."}
                  {connectionMethod && "Suivez les instructions dans la fenêtre ci-dessous."}
                </p>
              </div>

              <div className="p-6 sm:p-8">

                {/* État : Choix de la méthode */}
                {!connectionMethod && (
                  <div className="space-y-4">
                    <button
                      onClick={() => setConnectionMethod("qr")}
                      className="w-full p-6 border-2 border-border-main rounded-xl hover:border-primary hover:bg-primary/5 transition-all group text-left flex items-center gap-4"
                    >
                      <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <QrCode className="w-8 h-8 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-text-main mb-1 text-lg">QR Code</h3>
                        <p className="text-sm text-text-subtle">Scannez avec l'appareil photo de WhatsApp</p>
                        <p className="text-xs text-primary mt-1">Recommandé • Plus rapide</p>
                      </div>
                      <ChevronRight className="w-6 h-6 text-text-subtle group-hover:text-primary transition-colors" />
                    </button>

                    <button
                      onClick={() => setConnectionMethod("phone")}
                      className="w-full p-6 border-2 border-border-main rounded-xl hover:border-accent hover:bg-accent/5 transition-all group text-left flex items-center gap-4"
                    >
                      <div className="w-16 h-16 bg-accent/10 rounded-xl flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                        <Phone className="w-8 h-8 text-accent" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-text-main mb-1 text-lg">Code de jumelage</h3>
                        <p className="text-sm text-text-subtle">Recevez un code à 8 caractères sur votre téléphone</p>
                        <p className="text-xs text-accent mt-1">Alternative pratique</p>
                      </div>
                      <ChevronRight className="w-6 h-6 text-text-subtle group-hover:text-accent transition-colors" />
                    </button>
                  </div>
                )}

                {/* État : Iframe + Validation de Clé */}
                {connectionMethod && (
                  <div className="space-y-8 animate-scale-in">
                    
                    {/* Le Générateur (Iframe) */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-text-main flex items-center gap-2">
                          <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs">1</span>
                          Générer la session
                        </h3>
                      </div>
                      
                      <div className="w-full h-[380px] bg-slate-50 border-2 border-border-main rounded-xl overflow-hidden relative shadow-inner">
                        <iframe 
                          src={connectionMethod === "qr" ? "https://session.rgnk.site/qr-code" : "https://session.rgnk.site/pairing-code"}
                          className="w-full h-full border-none"
                          title="Générateur RGNK"
                          sandbox="allow-scripts allow-same-origin allow-forms"
                        />
                      </div>
                      <p className="text-xs text-center text-text-subtle mt-2">
                        Une fois le processus terminé, la page ci-dessus affichera un code (ex: <code className="bg-panel-hover px-1 rounded">RGNK~...</code>). Copiez-le.
                      </p>
                    </div>

                    {/* Le Formulaire de Validation (Liaison) */}
                    <div className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl border border-primary/20 shadow-md">
                      <h3 className="font-bold text-text-main flex items-center gap-2 mb-4">
                        <span className="w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-xs">2</span>
                        Activer le Bot sur MyZapp
                      </h3>
                      
                      {error && (
                        <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
                          <p className="text-sm text-error">{error}</p>
                        </div>
                      )}

                      <form onSubmit={handleConnectSession} className="space-y-4">
                        <div>
                          <label htmlFor="sessionId" className="block text-sm font-bold text-text-main mb-2">
                            Collez votre ID de Session ici :
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <KeyRound className="w-5 h-5 text-primary" />
                            </div>
                            <input
                              type="text"
                              id="sessionId"
                              value={sessionIdInput}
                              onChange={(e) => setSessionIdInput(e.target.value)}
                              className="w-full pl-12 pr-4 py-4 border-2 border-primary/30 rounded-xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all font-mono text-lg shadow-sm"
                              placeholder="RGNK~..."
                              required
                              disabled={isSubmitting}
                            />
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                              <Copy className="w-5 h-5 text-text-subtle opacity-50" />
                            </div>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitting || !sessionIdInput.trim()}
                          className="w-full py-4 bg-primary text-white text-lg font-bold rounded-xl hover:bg-primary-darker hover:shadow-lg transition-all disabled:opacity-50 disabled:hover:shadow-none flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-6 h-6 animate-spin" />
                              Connexion et démarrage du Bot...
                            </>
                          ) : (
                            <>
                              <Zap className="w-6 h-6" />
                              Lier le Bot à mon compte
                            </>
                          )}
                        </button>
                      </form>
                    </div>

                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-8 py-6 bg-panel-hover border-t border-border-main">
                <div className="flex items-center justify-between text-xs text-text-subtle">
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    <span>Connexion sécurisée par Baileys</span>
                  </div>
                  <Link href="/dashboard" className="text-primary hover:text-primary-darker font-semibold">
                    Ignorer pour l'instant →
                  </Link>
                </div>
              </div>
            </div>

            {/* Aide */}
            <div className="mt-6 text-center text-sm text-text-subtle">
              <p>Besoin d'aide ? <Link href="/dashboard/help" className="text-primary hover:text-primary-darker font-semibold">Consultez notre guide d'installation</Link></p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}