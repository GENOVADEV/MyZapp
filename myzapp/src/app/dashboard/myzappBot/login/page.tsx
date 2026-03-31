// src/app/dashboard/whatsapp/page.tsx
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
  RefreshCw,
  Smartphone,
  Info,
  ChevronRight
} from "lucide-react";
import { useBot } from "@/contexts/BotContext";
import Link from "next/link";
import { error } from "console";
import { toast } from "sonner";

type ConnectionMethod = "qr" | "phone" | null;

export default function WhatsAppConnectionPage() {
  const router = useRouter();
  const {
    status,
    qrCode,
    pairingCode,
    errorMessage,
    connectByQR,
    connectByPhone,
    resetState
  } = useBot();

  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('')

  // Si déjà connecté, rediriger
  useEffect(() => {
    if (status === "connected") {
      router.push("/dashboard");
    }
  }, [status, router]);

  // Gestion de la connexion par QR
  const handleQRConnection = async () => {
    setConnectionMethod("qr");
    setIsSubmitting(true);
    try {
      setTimeout(() => {
        if (!qrCode) {
          setIsSubmitting(false);
          setError("Délai d'attente dépassé. Vérifiez votre connection internet et réessayer.");
          toast.error(error);
        }
      }, 2000)
      await connectByQR();
    } catch (error) {
      console.error("Erreur QR:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gestion de la connexion par téléphone
  const handlePhoneConnection = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation basique
    if (!phoneNumber || phoneNumber.length < 8) {
      return;
    }

    setIsSubmitting(true);
    try {
      setTimeout(() => {
        if (!qrCode) {
          setIsSubmitting(false);
          setError("Délai d'attente dépassé. Vérifiez votre connection internet et réessayer.");
          toast.error(error);
        }
      }, 2000)
      await connectByPhone(phoneNumber);
    } catch (error) {
      console.error("Erreur Phone:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Réinitialiser et choisir une autre méthode
  const handleReset = () => {
    resetState();
    setConnectionMethod(null);
    setPhoneNumber("");
  };

  // Format du numéro de téléphone
  const formatPhoneNumber = (value: string) => {
    // Supprimer tout sauf les chiffres et le +
    const cleaned = value.replace(/[^\d+]/g, '');
    setPhoneNumber(cleaned);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">

          {/* Partie Gauche - Informations */}
          <div className="hidden lg:block space-y-8 animate-slide-in-left">

            {/* Header */}
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
                Connectez votre WhatsApp pour débloquer toutes les fonctionnalités de MyZapp et gérer vos conversations depuis une seule interface.
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
                  description: "Programmez des messages, créez des bots, automatisez vos réponses.",
                  color: "text-primary",
                  bg: "bg-primary/10"
                },
                {
                  icon: <MessageCircle className="w-5 h-5" />,
                  title: "Gestion Multi-Comptes",
                  description: "Gérez plusieurs comptes WhatsApp depuis une seule interface.",
                  color: "text-accent",
                  bg: "bg-accent/10"
                },
                {
                  icon: <Smartphone className="w-5 h-5" />,
                  title: "Synchronisation Temps Réel",
                  description: "Vos messages sont synchronisés instantanément sur tous vos appareils.",
                  color: "text-purple-500",
                  bg: "bg-purple-500/10"
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

            {/* Note de sécurité */}
            <div className="bg-primary/5 border-l-4 border-primary p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-text-main mb-1">Note de sécurité</h4>
                  <p className="text-sm text-text-subtle">
                    MyZapp ne stocke jamais vos conversations. Nous utilisons le protocole officiel WhatsApp Web pour garantir la sécurité de vos données.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Partie Droite - Interface de Connexion */}
          <div className="w-full animate-slide-in-right">
            <div className="panel-card rounded-2xl shadow-2xl border-2 border-border-main overflow-hidden">

              {/* Header de la carte */}
              <div className="bg-gradient-to-br from-primary/5 to-accent/5 p-6 border-b border-border-main">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold text-text-main">
                    {!connectionMethod && "Choisissez une méthode"}
                    {connectionMethod === "qr" && "Scannez le QR Code"}
                    {connectionMethod === "phone" && "Code de jumelage"}
                  </h2>
                  {connectionMethod && (
                    <button
                      onClick={handleReset}
                      className="p-2 hover:bg-panel-hover rounded-lg transition-colors"
                      aria-label="Retour"
                    >
                      <ArrowLeft className="w-5 h-5 text-text-subtle" />
                    </button>
                  )}
                </div>
                <p className="text-text-subtle">
                  {!connectionMethod && "Connectez votre WhatsApp en quelques secondes"}
                  {connectionMethod === "qr" && "Ouvrez WhatsApp sur votre téléphone"}
                  {connectionMethod === "phone" && "Entrez le code sur votre téléphone"}
                </p>
              </div>

              <div className="p-8">

                {/* État : Erreur */}
                {status === "error" && errorMessage && error && (
                  <div className="mb-6 p-4 bg-error/10 border border-error/30 rounded-lg flex items-start gap-3 animate-shake">
                    <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-error font-semibold mb-1">Erreur de connexion</p>
                      <p className="text-sm text-error">{errorMessage || error}</p>
                    </div>
                    <button
                      onClick={handleReset}
                      className="text-error hover:text-error/80"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* État : Connexion réussie */}
                {status === "connected" && (
                  <div className="text-center py-8 animate-scale-in">
                    <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-10 h-10 text-accent" />
                    </div>
                    <h3 className="text-2xl font-bold text-text-main mb-2">Connecté avec succès !</h3>
                    <p className="text-text-subtle mb-6">
                      Votre compte WhatsApp est maintenant lié à MyZapp
                    </p>
                    <button
                      onClick={() => router.push("/dashboard")}
                      className="btn-primary px-8 py-3"
                    >
                      Accéder au Dashboard
                    </button>
                  </div>
                )}

                {/* État : Choix de la méthode */}
                {!connectionMethod && status !== "connected" && (
                  <div className="space-y-4">
                    <p className="text-sm text-text-subtle text-center mb-6">
                      Choisissez votre méthode de connexion préférée
                    </p>

                    {/* Méthode QR Code */}
                    <button
                      onClick={handleQRConnection}
                      disabled={isSubmitting}
                      className="w-full p-6 border-2 border-border-main rounded-xl hover:border-primary hover:bg-primary/5 transition-all group text-left flex items-center gap-4"
                    >
                      <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <QrCode className="w-8 h-8 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-text-main mb-1 text-lg">QR Code</h3>
                        <p className="text-sm text-text-subtle">
                          Scannez avec l'appareil photo de WhatsApp
                        </p>
                        <p className="text-xs text-primary mt-1">Recommandé • Plus rapide</p>
                      </div>
                      <ChevronRight className="w-6 h-6 text-text-subtle group-hover:text-primary transition-colors" />
                    </button>

                    {/* Méthode Téléphone */}
                    <button
                      onClick={() => setConnectionMethod("phone")}
                      disabled={isSubmitting}
                      className="w-full p-6 border-2 border-border-main rounded-xl hover:border-accent hover:bg-accent/5 transition-all group text-left flex items-center gap-4"
                    >
                      <div className="w-16 h-16 bg-accent/10 rounded-xl flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                        <Phone className="w-8 h-8 text-accent" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-text-main mb-1 text-lg">Code de jumelage</h3>
                        <p className="text-sm text-text-subtle">
                          Recevez un code à 8 chiffres sur votre téléphone
                        </p>
                        <p className="text-xs text-accent mt-1">Alternative pratique</p>
                      </div>
                      <ChevronRight className="w-6 h-6 text-text-subtle group-hover:text-accent transition-colors" />
                    </button>
                  </div>
                )}

                {/* Méthode QR : Affichage du QR Code */}
                {connectionMethod === "qr" && status !== "connected" && (
                  <div className="space-y-6">
                    {/* QR Code */}
                    {qrCode ? (
                      <div className="space-y-4 animate-scale-in">
                        <div className="bg-white p-6 rounded-xl border-2 border-border-main mx-auto w-fit">
                          <img
                            src={qrCode}
                            alt="QR Code WhatsApp"
                            className="w-64 h-64"
                          />
                        </div>

                        {/* Instructions */}
                        <div className="bg-panel-hover p-4 rounded-lg space-y-3">
                          <p className="font-semibold text-text-main text-sm">Comment scanner :</p>
                          <ol className="space-y-2 text-sm text-text-subtle">
                            <li className="flex items-start gap-2">
                              <span className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                              <span>Ouvrez WhatsApp sur votre téléphone</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                              <span>Allez dans <strong>Menu</strong> ou <strong>Paramètres</strong></span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                              <span>Touchez <strong>Appareils liés</strong> puis <strong>Lier un appareil</strong></span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                              <span>Scannez ce QR code avec votre téléphone</span>
                            </li>
                          </ol>
                        </div>

                        {/* Bouton rafraîchir */}
                        <button
                          onClick={handleQRConnection}
                          disabled={isSubmitting}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-border-main rounded-xl hover:border-primary hover:bg-primary/5 transition-all font-medium text-text-main"
                        >
                          <RefreshCw className={`w-5 h-5 ${isSubmitting ? 'animate-spin' : ''}`} />
                          Générer un nouveau QR Code
                        </button>
                      </div>
                    ) : status === "connecting" || !isSubmitting ? (
                      <div className="text-center py-12 animate-fade-in">
                        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                        <p className="text-text-main font-semibold">Génération du QR Code...</p>
                        <p className="text-sm text-text-subtle mt-2">Veuillez patienter</p>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Méthode Téléphone : Formulaire */}
                {connectionMethod === "phone" && status !== "connected" && !pairingCode && (
                  <form onSubmit={handlePhoneConnection} className="space-y-6 animate-slide-up">
                    <div className="space-y-2">
                      <label htmlFor="phone" className="block text-sm font-semibold text-text-main">
                        Numéro de téléphone WhatsApp *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Phone className="w-5 h-5 text-text-subtle" />
                        </div>
                        <input
                          type="tel"
                          id="phone"
                          value={phoneNumber}
                          onChange={(e) => formatPhoneNumber(e.target.value)}
                          className="input-whatsapp w-full pl-12 pr-4 py-3 text-base"
                          placeholder="+33 6 12 34 56 78"
                          required
                          disabled={isSubmitting || status === "connecting"}
                        />
                      </div>
                      <p className="text-xs text-text-subtle">
                        Format international avec indicatif pays (ex: +33 pour la France)
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || status === "connecting" || phoneNumber.length < 8}
                      className="btn-primary w-full py-4 text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {(!isSubmitting || status === "connecting") ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Génération du code...
                        </>
                      ) : (
                        <>
                          Obtenir le code
                          <ArrowLeft className="w-5 h-5 rotate-180" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Méthode Téléphone : Affichage du code */}
                {connectionMethod === "phone" && pairingCode && status !== "connected" && (
                  <div className="space-y-6 animate-scale-in">
                    {/* Code de jumelage */}
                    <div className="text-center py-8 bg-gradient-to-br from-accent/5 to-primary/5 rounded-xl border-2 border-border-main">
                      <p className="text-sm text-text-subtle mb-3">Votre code de jumelage :</p>
                      <div className="text-5xl font-bold text-text-main tracking-widest mb-2 font-mono">
                        {pairingCode}
                      </div>
                      <p className="text-xs text-text-subtle">Code valide pendant 2 minutes</p>
                    </div>

                    {/* Instructions */}
                    <div className="bg-panel-hover p-4 rounded-lg space-y-3">
                      <p className="font-semibold text-text-main text-sm">Comment utiliser ce code :</p>
                      <ol className="space-y-2 text-sm text-text-subtle">
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 bg-accent text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                          <span>Ouvrez WhatsApp sur votre téléphone <strong>{phoneNumber}</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 bg-accent text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                          <span>Allez dans <strong>Paramètres</strong> → <strong>Appareils liés</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 bg-accent text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                          <span>Touchez <strong>Lier un appareil</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 bg-accent text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                          <span>Sélectionnez <strong>Lier avec un numéro de téléphone</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 bg-accent text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">5</span>
                          <span>Entrez le code <strong>{pairingCode}</strong></span>
                        </li>
                      </ol>
                    </div>

                    {/* Bouton nouveau code */}
                    <button
                      onClick={() => handlePhoneConnection(new Event('submit') as any)}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-border-main rounded-xl hover:border-accent hover:bg-accent/5 transition-all font-medium text-text-main"
                    >
                      <RefreshCw className={`w-5 h-5 ${isSubmitting ? 'animate-spin' : ''}`} />
                      Générer un nouveau code
                    </button>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="px-8 py-6 bg-panel-hover border-t border-border-main">
                <div className="flex items-center justify-between text-xs text-text-subtle">
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    <span>Connexion sécurisée E2EE</span>
                  </div>
                  <Link href="/dashboard" className="text-primary hover:text-primary-darker font-semibold">
                    Ignorer pour l'instant →
                  </Link>
                </div>
              </div>
            </div>

            {/* Aide */}
            <div className="mt-6 text-center text-sm text-text-subtle">
              <p>Besoin d'aide ? <Link href="/dashboard/help" className="text-primary hover:text-primary-darker font-semibold">Consultez notre guide</Link></p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
