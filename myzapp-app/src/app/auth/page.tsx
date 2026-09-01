"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Lock, 
  Mail, 
  User, 
  Phone, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowLeft, 
  RefreshCw,
  Globe,
  Sparkles,
  Bot
} from "lucide-react";
import { COUNTRIES } from "@/lib/countries";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "register" ? "register" : "login";

  const [authState, setAuthState] = useState<"login" | "register" | "otp" | "forgot_email" | "forgot_otp" | "forgot_reset">(
    initialTab === "register" ? "register" : "login"
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("CI");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [identifier, setIdentifier] = useState("");

  // OTP & Reset States
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [otpReason, setOtpReason] = useState<"register" | "reset">("register");

  useEffect(() => {
    const token = localStorage.getItem("myzapp_token");
    if (token && authState !== "otp") {
      router.push("/app");
    }
  }, [router, authState]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit comporter au moins 6 caractères.");
      return;
    }

    setIsLoading(true);

    try {
      const selectedCountry = COUNTRIES.find((c) => c.code === countryCode);
      const fullPhone = phone ? `${selectedCountry?.dialCode || "+225"} ${phone.trim()}` : "";

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: fullPhone,
          password,
          confirmPassword
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'inscription.");
      }

      setOtpReason("register");
      setSuccess("Compte créé ! Veuillez valider votre email en saisissant le code OTP.");
      setAuthState("otp");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data.requiresVerification) {
          setEmail(data.email);
          setOtpReason("register");
          setError(data.error);
          setAuthState("otp");
          return;
        }
        throw new Error(data.error || "Identifiant ou mot de passe incorrect.");
      }

      localStorage.setItem("myzapp_token", data.token);
      localStorage.setItem("myzapp_user", JSON.stringify(data.user));
      router.push("/app");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Code OTP incorrect.");
      }

      localStorage.setItem("myzapp_token", data.token);
      localStorage.setItem("myzapp_user", JSON.stringify(data.user));
      router.push("/app");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, reason: otpReason }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Impossible de renvoyer le code.");
      }

      setSuccess(data.message || "Un nouveau code a été envoyé.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Une erreur est survenue.");
      }

      setOtpReason("reset");
      setSuccess(data.message || "Code de récupération envoyé.");
      setAuthState("forgot_otp");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyResetOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Code OTP incorrect.");
      }

      setSuccess("Code validé ! Vous pouvez saisir votre nouveau mot de passe.");
      setAuthState("forgot_reset");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmNewPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpCode, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors du changement de mot de passe.");
      }

      setSuccess("Votre mot de passe a été modifié avec succès. Connectez-vous !");
      setAuthState("login");
      setPassword("");
      setOtpCode("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] pt-6 sm:pt-12 pb-12 sm:pb-16 flex flex-col justify-center items-center px-3 sm:px-4 relative overflow-hidden">
      {/* Background Lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#00D06C]/15 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-[#3B82F6]/10 blur-[130px] pointer-events-none rounded-full" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-3 group mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00D06C] to-[#00FFA2] p-0.5 shadow-xl shadow-emerald-500/20 group-hover:scale-105 transition-transform overflow-hidden">
              <div className="w-full h-full bg-[#060D1F] rounded-[14px] flex items-center justify-center p-1.5">
                <img src="/logo.svg" alt="MyZapp" className="w-full h-full object-contain" />
              </div>
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1">
                <span className="text-2xl font-black text-white">My<span className="text-[#00D06C]">Zapp</span></span>
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Espace Bot WhatsApp
              </span>
            </div>
          </Link>

          <h2 className="text-2xl font-black text-white">
            {authState === "login" && "Connexion à votre Espace"}
            {authState === "register" && "Créez votre Bot WhatsApp"}
            {authState === "otp" && "Validation de votre Email"}
            {authState === "forgot_email" && "Mot de passe oublié"}
            {authState === "forgot_otp" && "Code de réinitialisation"}
            {authState === "forgot_reset" && "Nouveau mot de passe"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {authState === "login" && "Pilotez vos sessions WhatsApp, IA et diffusions en toute simplicité."}
            {authState === "register" && "Rejoignez MyZapp et activez votre bot en 2 minutes chrono."}
            {authState === "otp" && `Entrez le code OTP envoyé à l'adresse ${email}`}
            {authState === "forgot_email" && "Entrez votre email pour recevoir le code de déblocage."}
            {authState === "forgot_otp" && `Saisissez le code de vérification reçu à ${email}`}
            {authState === "forgot_reset" && "Choisissez votre nouveau mot de passe sécurisé."}
          </p>
        </div>

        {/* Auth Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10">
          {/* Tab switch */}
          {(authState === "login" || authState === "register") && (
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-900 border border-white/10 mb-6">
              <button
                onClick={() => { setAuthState("login"); setError(null); setSuccess(null); }}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all text-center ${
                  authState === "login"
                    ? "bg-[#00D06C] text-[#060D1F] shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Connexion
              </button>
              <button
                onClick={() => { setAuthState("register"); setError(null); setSuccess(null); }}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all text-center ${
                  authState === "register"
                    ? "bg-[#00D06C] text-[#060D1F] shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Inscription
              </button>
            </div>
          )}

          {error && (
            <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 mb-5">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 mb-5">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* 1. LOGIN FORM */}
          {authState === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Email ou Numéro de Téléphone</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="ex: user@gmail.com ou +2250700000000"
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#00D06C] transition-colors placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-300">Mot de passe</label>
                  <button
                    type="button"
                    onClick={() => { setAuthState("forgot_email"); setError(null); setSuccess(null); }}
                    className="text-xs text-[#00FFA2] hover:underline font-medium"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#00D06C] transition-colors placeholder:text-slate-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl btn-myzapp text-sm font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 mt-2"
              >
                <span>{isLoading ? "Connexion..." : "Se connecter"}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* 2. REGISTER FORM */}
          {authState === "register" && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Nom complet</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: Jean Dupont"
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#00D06C] transition-colors placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Country Dial Code + Phone input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Numéro WhatsApp</label>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-2.5 py-3 text-xs text-white focus:outline-none focus:border-[#00D06C] cursor-pointer"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                          {c.flag} {c.code} ({c.dialCode})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-7 relative">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="07 00 00 00 00"
                      className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-8 pr-3 py-3 text-sm text-white focus:outline-none focus:border-[#00D06C] transition-colors placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Adresse Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jean@exemple.com"
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#00D06C] transition-colors placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Mot de passe</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 car."
                      className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-8 pr-3 py-3 text-xs text-white focus:outline-none focus:border-[#00D06C] transition-colors placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Confirmation</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-8 pr-3 py-3 text-xs text-white focus:outline-none focus:border-[#00D06C] transition-colors placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl btn-myzapp text-sm font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 mt-3"
              >
                <span>{isLoading ? "Création du compte..." : "Créer mon compte MyZapp"}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* 3. OTP VERIFICATION */}
          {authState === "otp" && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 text-center block">
                  Code de vérification reçu par email
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl py-3.5 text-center text-xl font-mono tracking-[10px] text-[#00FFA2] focus:outline-none focus:border-[#00D06C] transition-colors"
                  />
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-950/60 p-3.5 rounded-xl border border-white/5 space-y-1.5 leading-snug">
                <p>⚠️ <strong>Délai d'envoi</strong> : Le code peut mettre 1 à 2 minutes à arriver.</p>
                <p>📬 Pensez à vérifier votre dossier <strong>Spams / Courriers indésirables</strong> si vous ne trouvez pas notre message dans votre boîte de réception.</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-800 transition-colors text-slate-300 disabled:opacity-50"
                >
                  <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
                  Renvoyer le code
                </button>

                <button
                  type="submit"
                  disabled={isLoading || otpCode.length !== 6}
                  className="flex-1 py-3 rounded-xl btn-myzapp text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-50"
                >
                  <span>Valider mon compte</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setAuthState("register"); setError(null); setSuccess(null); }}
                className="w-full text-center text-xs text-slate-400 hover:text-white transition-colors pt-2 flex items-center justify-center gap-1"
              >
                <ArrowLeft size={12} /> Modifier les informations
              </button>
            </form>
          )}

          {/* 4. FORGOT PASSWORD - EMAIL */}
          {authState === "forgot_email" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Votre adresse email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jean@exemple.com"
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#00D06C] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl btn-myzapp text-sm font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                <span>Envoyer le code de réinitialisation</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => { setAuthState("login"); setError(null); setSuccess(null); }}
                className="w-full text-center text-xs text-slate-400 hover:text-white transition-colors pt-2 flex items-center justify-center gap-1"
              >
                <ArrowLeft size={12} /> Retour à la connexion
              </button>
            </form>
          )}

          {/* 5. FORGOT PASSWORD - OTP */}
          {authState === "forgot_otp" && (
            <form onSubmit={handleVerifyResetOTP} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 text-center block">
                  Code OTP reçu pour la réinitialisation
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full bg-slate-900/90 border border-white/10 rounded-xl py-3.5 text-center text-xl font-mono tracking-[10px] text-sky-400 focus:outline-none focus:border-sky-400 transition-colors"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-800 transition-colors text-slate-300 disabled:opacity-50"
                >
                  <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
                  Renvoyer
                </button>

                <button
                  type="submit"
                  disabled={isLoading || otpCode.length !== 6}
                  className="flex-1 py-3 rounded-xl btn-myzapp text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-50"
                >
                  <span>Vérifier</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setAuthState("forgot_email"); setError(null); setSuccess(null); }}
                className="w-full text-center text-xs text-slate-400 hover:text-white transition-colors pt-2 flex items-center justify-center gap-1"
              >
                <ArrowLeft size={12} /> Modifier l'email
              </button>
            </form>
          )}

          {/* 6. FORGOT PASSWORD - NEW PASSWORD */}
          {authState === "forgot_reset" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Nouveau mot de passe</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 caractères"
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#00D06C] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Confirmer le mot de passe</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#00D06C] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl btn-myzapp text-sm font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                <span>Enregistrer le mot de passe</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}
        </div>

        {/* Security Badge */}
        <div className="mt-6 text-center flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck size={14} className="text-[#00D06C]" />
          <span>Données et sessions chiffrées de bout en bout</span>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#060D1F]">
        <div className="w-8 h-8 rounded-full border-2 border-[#00D06C] border-t-transparent animate-spin" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
