"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bot,
  Zap,
  QrCode,
  Phone,
  ShieldCheck,
  Radio,
  Power,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Send,
  Layers,
  MessageSquare,
  Settings,
  LogOut,
  Sliders,
  Play,
  Pause,
  Download,
  Users
} from "lucide-react";

export default function UserAppDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [botStatus, setBotStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Connection Studio states
  const [showStudio, setShowStudio] = useState(false);
  const [studioMethod, setStudioMethod] = useState<"qr" | "pair">("qr");
  const [sessionInput, setSessionInput] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Feature Toggles state
  const [aiEnabled, setAiEnabled] = useState(true);
  const [antiBanMode, setAntiBanMode] = useState<"business" | "normal" | "fast">("business");
  const [antiLinkEnabled, setAntiLinkEnabled] = useState(true);
  const [autoDlEnabled, setAutoDlEnabled] = useState(true);

  // Broadcast modal
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);

  useEffect(() => {
    fetchProfileAndStatus();
  }, []);

  const fetchProfileAndStatus = async () => {
    const token = localStorage.getItem("myzapp_token");
    if (!token) {
      router.push("/auth");
      return;
    }

    try {
      const meRes = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const meData = await meRes.json();
      if (!meRes.ok) throw new Error(meData.error);
      setUser(meData.user);

      const botRes = await fetch("/api/bot/session", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const botData = await botRes.json();
      if (botRes.ok) {
        setBotStatus(botData);
        if (botData.session) {
          setSessionInput(botData.session);
        }
      }
    } catch (err) {
      console.error(err);
      localStorage.removeItem("myzapp_token");
      router.push("/auth");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectSession = async (customSession?: string) => {
    const rawSession = customSession || sessionInput;
    if (!rawSession || !rawSession.trim().startsWith("RGNK~")) {
      setActionMessage({
        type: "error",
        text: "Format de session invalide. Le code doit débuter par 'RGNK~'"
      });
      return;
    }

    setConnectLoading(true);
    setActionMessage(null);

    try {
      const token = localStorage.getItem("myzapp_token");
      const res = await fetch("/api/bot/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ session: rawSession.trim() })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de connexion");

      setActionMessage({
        type: "success",
        text: data.message || "Session WhatsApp connectée avec succès !"
      });

      setShowStudio(false);
      fetchProfileAndStatus();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setConnectLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Voulez-vous vraiment déconnecter votre session WhatsApp du bot ?")) return;

    try {
      const token = localStorage.getItem("myzapp_token");
      await fetch("/api/bot/disconnect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchProfileAndStatus();
    } catch (e) {
      console.error(e);
    }
  };

  const handleClipboardPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim().startsWith("RGNK~")) {
        setSessionInput(text.trim());
        handleConnectSession(text.trim());
      } else {
        setActionMessage({
          type: "error",
          text: "Aucun code RGNK~ valide détecté dans votre presse-papiers."
        });
      }
    } catch (e) {
      setActionMessage({
        type: "error",
        text: "Veuillez coller manuellement le code de session dans le champ ci-dessous."
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("myzapp_token");
    localStorage.removeItem("myzapp_user");
    router.push("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060D1F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#00D06C] border-t-transparent animate-spin" />
          <span className="text-xs font-bold text-slate-400">Chargement de votre espace MyZapp...</span>
        </div>
      </div>
    );
  }

  const isConnected = botStatus?.connected;

  return (
    <div className="min-h-screen bg-[#060D1F] pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* User Header & Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 rounded-3xl border border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#00D06C] to-[#00FFA2] p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-[#060D1F] rounded-[14px] flex items-center justify-center p-2">
                <img src="/logo.svg" alt="MyZapp" className="w-full h-full object-contain" />
              </div>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>Espace Bot de {user?.name}</span>
                <span className="badge badge-xs bg-emerald-500/20 text-[#00FFA2] border-none text-[10px] font-bold">
                  PRO
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>{user?.email}</span>
                <span>•</span>
                <span>{user?.phone || "Numéro non renseigné"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStudio(true)}
              className="btn btn-sm btn-myzapp rounded-xl text-xs px-4 gap-1.5 shadow-lg"
            >
              <Zap size={14} />
              <span>{isConnected ? "Changer de Session" : "Connecter WhatsApp"}</span>
            </button>

            <button
              onClick={handleLogout}
              className="btn btn-sm btn-ghost text-slate-400 hover:text-white rounded-xl"
              title="Déconnexion"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Action / Alert Message */}
        {actionMessage && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 ${actionMessage.type === "success"
                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/15 border border-rose-500/30 text-rose-300"
              }`}
          >
            {actionMessage.type === "success" ? (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-rose-400 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* Bot Status Banner & Live KPI Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Connection Status Card */}
          <div className="md:col-span-2 glass-card p-6 rounded-3xl border border-white/10 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-black tracking-wider uppercase text-slate-400">
                  État de Connexion WhatsApp
                </span>
                <div className="flex items-center gap-2.5 mt-2">
                  <span
                    className={`w-3.5 h-3.5 rounded-full ${isConnected ? "bg-[#00FFA2] animate-pulse shadow-lg shadow-emerald-500/50" : "bg-rose-500"
                      }`}
                  />
                  <h2 className="text-2xl font-black text-white">
                    {isConnected ? "Bot En Ligne & Actif" : "Bot Déconnecté"}
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  {isConnected
                    ? `Session active : ${botStatus.session?.substring(0, 15)}... Prêt à exécuter les automatisations.`
                    : "Votre bot n'est pas encore relié à un compte WhatsApp. Utilisez le studio pour appairer votre compte en 1 minute."}
                </p>
              </div>

              {isConnected ? (
                <button
                  onClick={handleDisconnect}
                  className="btn btn-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/30 rounded-lg text-[11px]"
                >
                  Déconnecter
                </button>
              ) : (
                <button
                  onClick={() => setShowStudio(true)}
                  className="btn btn-sm btn-myzapp rounded-xl text-xs px-3"
                >
                  Appairer maintenant
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 pt-6 mt-6 border-t border-white/5">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase">Disponibilité</span>
                <p className="text-sm font-black text-white">{botStatus?.stats?.uptime || "--"}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase">Latence Serveur</span>
                <p className="text-sm font-black text-[#00FFA2]">{botStatus?.stats?.ping || "--"}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase">Sécurité Anti-Ban</span>
                <p className="text-sm font-black text-sky-400">Actif (Pauses 15m)</p>
              </div>
            </div>
          </div>

          {/* Quick Connect Studio Launcher Card */}
          <div className="glass-card p-6 rounded-3xl border border-white/10 flex flex-col justify-between bg-gradient-to-br from-emerald-500/10 to-transparent">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-[#00FFA2] mb-3">
                <QrCode size={20} />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Studio WhatsApp</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connectez-vous par <strong>QR Code</strong> ou <strong>Numéro de téléphone</strong> via notre passerelle sécurisée.
              </p>
            </div>

            <div className="space-y-2 pt-4">
              <button
                onClick={() => { setStudioMethod("qr"); setShowStudio(true); }}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors"
              >
                <QrCode size={14} className="text-[#00D06C]" />
                <span>Scanner le QR Code</span>
              </button>
              <button
                onClick={() => { setStudioMethod("pair"); setShowStudio(true); }}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors"
              >
                <Phone size={14} className="text-sky-400" />
                <span>Code d'Appairage (Téléphone)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feature Controls Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Sliders size={18} className="text-[#00D06C]" />
              <span>Pilotage des Modules du Bot</span>
            </h3>
            <span className="text-xs text-slate-500">Moteur Raganork v6.2.30</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Chatbot IA Toggle */}
            <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-[#00FFA2]">
                  <Bot size={18} />
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-success toggle-sm"
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">IA Gemini Pro</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Réponses intelligentes et personnalisées 24/7.</p>
              </div>
              <span className="badge badge-xs bg-emerald-500/20 text-[#00FFA2] border-none text-[10px]">
                {aiEnabled ? "Actif" : "En pause"}
              </span>
            </div>

            {/* 2. Anti-Ban Broadcast */}
            <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
                  <Send size={18} />
                </div>
                <select
                  value={antiBanMode}
                  onChange={(e: any) => setAntiBanMode(e.target.value)}
                  className="bg-slate-900 border border-white/10 text-white text-[11px] rounded-lg px-2 py-1"
                >
                  <option value="business">Business (Pauses 15m)</option>
                  <option value="normal">Normal</option>
                  <option value="fast">Rapide</option>
                </select>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Diffusion Sécurisée</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Évite les blocages de numéro par WhatsApp.</p>
              </div>
              <span className="badge badge-xs bg-sky-500/20 text-sky-400 border-none text-[10px]">
                {antiBanMode === "business" ? "Ultra-Sécurisé" : "Standard"}
              </span>
            </div>

            {/* 3. Anti-Link Protection */}
            <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <ShieldCheck size={18} />
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-warning toggle-sm"
                  checked={antiLinkEnabled}
                  onChange={(e) => setAntiLinkEnabled(e.target.checked)}
                />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Protection Groupes</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Anti-liens, anti-spam et suppression auto.</p>
              </div>
              <span className="badge badge-xs bg-amber-500/20 text-amber-400 border-none text-[10px]">
                {antiLinkEnabled ? "Surveillance active" : "Désactivé"}
              </span>
            </div>

            {/* 4. Media Auto-downloader */}
            <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <Download size={18} />
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-secondary toggle-sm"
                  checked={autoDlEnabled}
                  onChange={(e) => setAutoDlEnabled(e.target.checked)}
                />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Téléchargeur 4K</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">TikTok sans logo, YouTube, Insta, Facebook.</p>
              </div>
              <span className="badge badge-xs bg-purple-500/20 text-purple-400 border-none text-[10px]">
                {autoDlEnabled ? "Prêt (Autodl)" : "Désactivé"}
              </span>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* WHATSAPP CONNECTION MODAL / STUDIO (IFRAME & SDK)    */}
        {/* ---------------------------------------------------- */}
        {showStudio && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0F172A] border border-white/15 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">

              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00D06C] to-[#00FFA2] p-0.5">
                    <div className="w-full h-full bg-[#060D1F] rounded-[10px] flex items-center justify-center p-1.5">
                      <img src="/logo.svg" alt="MyZapp" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Studio de Connexion WhatsApp</h3>
                    <p className="text-xs text-slate-400">Liez votre compte WhatsApp en toute sécurité</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowStudio(false)}
                  className="btn btn-sm btn-circle btn-ghost text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Method Selector */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-2xl border border-white/10">
                <button
                  onClick={() => setStudioMethod("qr")}
                  className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${studioMethod === "qr"
                      ? "bg-[#00D06C] text-[#060D1F] shadow-lg"
                      : "text-slate-400 hover:text-white"
                    }`}
                >
                  <QrCode size={16} />
                  <span>Scanner QR Code</span>
                </button>
                <button
                  onClick={() => setStudioMethod("pair")}
                  className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${studioMethod === "pair"
                      ? "bg-[#00D06C] text-[#060D1F] shadow-lg"
                      : "text-slate-400 hover:text-white"
                    }`}
                >
                  <Phone size={16} />
                  <span>Code par Téléphone</span>
                </button>
              </div>

              {/* Interactive Iframe Window */}
              <div className="rounded-2xl border border-white/10 bg-[#060D1F] overflow-hidden relative min-h-[380px]">
                <div className="bg-[#0A1128] px-4 py-2.5 text-[11px] text-slate-400 border-b border-white/5 flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <ShieldCheck size={13} className="text-[#00FFA2]" />
                    <span>Passerelle Sécurisée MyZapp Authenticator</span>
                  </span>
                  <span className="badge badge-xs bg-emerald-500/20 text-[#00FFA2] border-none text-[10px] font-mono">
                    Canal Direct SSL
                  </span>
                </div>

                <iframe
                  src={studioMethod === "qr" ? "https://session.rgnk.site/qr-code" : "https://session.rgnk.site/pairing-code"}
                  className="w-full h-[360px] border-none bg-white rounded-b-2xl"
                  title="Passerelle d'Authentification MyZapp"
                />
              </div>

              {/* Session Input & Auto Paste Box */}
              <div className="space-y-3 bg-slate-900/90 p-4 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white">
                    Code de Session obtenu (Commence par RGNK~...) :
                  </label>
                  <button
                    type="button"
                    onClick={handleClipboardPaste}
                    className="text-xs font-bold text-[#00FFA2] hover:underline flex items-center gap-1"
                  >
                    <Copy size={12} />
                    <span>Coller du presse-papiers</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sessionInput}
                    onChange={(e) => setSessionInput(e.target.value)}
                    placeholder="Ex: RGNK~QzuUU3iC..."
                    className="flex-1 bg-slate-950 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#00D06C] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleConnectSession()}
                    disabled={connectLoading || !sessionInput}
                    className="btn btn-sm btn-myzapp rounded-xl px-4 text-xs font-bold disabled:opacity-50"
                  >
                    {connectLoading ? "Connexion..." : "Démarrer le Bot"}
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 space-y-1">
                <p>💡 <strong>Instructions simples</strong> :</p>
                <p>1. Scannez le QR Code ou entrez votre numéro dans l'écran ci-dessus.</p>
                <p>2. Vous recevrez votre code de session commençant par <code>RGNK~...</code> dans vos messages WhatsApp.</p>
                <p>3. Copiez-le et collez-le ici pour lancer automatiquement votre Bot MyZapp !</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
