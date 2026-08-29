"use client";

import { useState, useEffect, useRef } from "react";
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
  Square,
  Download,
  Users,
  Film,
  Music,
  FileText,
  ShieldAlert,
  Lock,
  EyeOff,
  Eye,
  Smile,
  Mic,
  Trash2,
  Plus,
  X,
  CheckSquare,
  SquareDashed,
  Volume2
} from "lucide-react";

export default function UserAppDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [botStatus, setBotStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "broadcast" | "ai" | "downloader" | "moderation" | "converters" | "settings">("overview");

  // Connection Studio states
  const [showStudio, setShowStudio] = useState(false);
  const [studioMethod, setStudioMethod] = useState<"qr" | "pair">("qr");
  const [sessionInput, setSessionInput] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Kill Switch state
  const [stoppingAll, setStoppingAll] = useState(false);

  // 1. Broadcast Studio state
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastMode, setBroadcastMode] = useState<"business" | "normal" | "fast">("business");
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [broadcastState, setBroadcastState] = useState<any>({ status: 'idle', progress: 0 });
  const [broadcastStarting, setBroadcastStarting] = useState(false);

  // 2. AI Gemini State
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiMode, setAiMode] = useState<"all" | "dm" | "group">("dm");
  const [systemPrompt, setSystemPrompt] = useState("Tu es l'assistant commercial IA de MyZapp. Sois poli, concis et efficace.");
  const [welcomeMessage, setWelcomeMessage] = useState("👋 Bienvenue ! Comment puis-je vous aider aujourd'hui ?");
  const [savingAi, setSavingAi] = useState(false);

  // 3. 4K Media Downloader State
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaFormat, setMediaFormat] = useState<"video" | "mp3">("video");
  const [mediaQuality, setMediaQuality] = useState<"720p" | "1080p" | "360p">("720p");
  const [downloadingMedia, setDownloadingMedia] = useState(false);

  // 4. Moderation & Safety State
  const [antiLinkEnabled, setAntiLinkEnabled] = useState(true);
  const [antiSpamEnabled, setAntiSpamEnabled] = useState(true);
  const [antiViewOnceEnabled, setAntiViewOnceEnabled] = useState(true);
  const [blockedWords, setBlockedWords] = useState<string[]>(["arnaque", "spam", "scam", "telegram.me", "wa.me"]);
  const [newWordInput, setNewWordInput] = useState("");
  const [savingModeration, setSavingModeration] = useState(false);

  // 5. Converters & Tools State
  const [stickerUrl, setStickerUrl] = useState("");
  const [convertingSticker, setConvertingSticker] = useState(false);
  const [ttsText, setTtsText] = useState("");
  const [generatingTts, setGeneratingTts] = useState(false);

  // Polling interval ref
  const pollingRef = useRef<any>(null);

  useEffect(() => {
    fetchProfileAndStatus();

    // Poll status every 5 seconds
    pollingRef.current = setInterval(() => {
      fetchStatusOnly();
    }, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const getAuthToken = () => localStorage.getItem("myzapp_token");

  const fetchProfileAndStatus = async () => {
    const token = getAuthToken();
    if (!token) {
      router.push("/auth");
      return;
    }

    try {
      const res = await fetch("/api/bot/status", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBotStatus(data);
        setUser({ session: data.session });

        if (data.botConfig) {
          const cfg = data.botConfig;
          if (cfg.aiEnabled !== undefined) setAiEnabled(cfg.aiEnabled);
          if (cfg.aiMode) setAiMode(cfg.aiMode);
          if (cfg.systemPrompt) setSystemPrompt(cfg.systemPrompt);
          if (cfg.welcomeMessage) setWelcomeMessage(cfg.welcomeMessage);
          if (cfg.antiLink !== undefined) setAntiLinkEnabled(cfg.antiLink);
          if (cfg.antiSpam !== undefined) setAntiSpamEnabled(cfg.antiSpam);
          if (cfg.antiViewOnce !== undefined) setAntiViewOnceEnabled(cfg.antiViewOnce);
          if (cfg.blockedWords) setBlockedWords(cfg.blockedWords);
        }

        if (data.broadcast) {
          setBroadcastState(data.broadcast);
        }
      }
    } catch (err) {
      console.error("Erreur récupération statut:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatusOnly = async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch("/api/bot/status", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBotStatus(data);
        if (data.broadcast) {
          setBroadcastState(data.broadcast);
        }
      }
    } catch (err) {
      // Background poll error
    }
  };

  // --- ACTIONS ---

  // 1. Arrêt d'urgence (Kill-Switch)
  const handleStopAll = async () => {
    setStoppingAll(true);
    setActionMessage(null);
    try {
      const token = getAuthToken();
      const res = await fetch("/api/bot/stop-all", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: "success", text: "⛔ Toutes les actions, diffusions et téléchargements ont été arrêtés avec succès !" });
        fetchStatusOnly();
      } else {
        setActionMessage({ type: "error", text: data.error || "Échec de l'arrêt d'urgence." });
      }
    } catch (e: any) {
      setActionMessage({ type: "error", text: e.message });
    } finally {
      setStoppingAll(false);
    }
  };

  // 2. Déconnexion WhatsApp
  const handleDisconnect = async () => {
    if (!confirm("Voulez-vous vraiment déconnecter votre session WhatsApp du bot ?")) return;
    setConnectLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch("/api/bot/disconnect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setActionMessage({ type: "success", text: "Session WhatsApp déconnectée avec succès." });
        setBotStatus((prev: any) => ({ ...prev, connected: false, session: null }));
        setUser((prev: any) => ({ ...prev, session: null }));
      }
    } catch (e: any) {
      setActionMessage({ type: "error", text: e.message });
    } finally {
      setConnectLoading(false);
    }
  };

  // 3. Connexion Session
  const handleConnectSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionInput.trim()) return;

    setConnectLoading(true);
    setActionMessage(null);

    try {
      const token = getAuthToken();
      const res = await fetch("/api/bot/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ session: sessionInput.trim() })
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: "success", text: "🎉 Bot WhatsApp connecté avec succès !" });
        setShowStudio(false);
        setSessionInput("");
        fetchProfileAndStatus();
      } else {
        setActionMessage({ type: "error", text: data.error || "Erreur de connexion" });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setConnectLoading(false);
    }
  };

  // 4. Charger Groupes
  const handleFetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const token = getAuthToken();
      const res = await fetch("/api/bot/groups", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setGroups(data.groups || []);
        if (selectedGroups.length === 0 && data.groups?.length > 0) {
          setSelectedGroups(data.groups.map((g: any) => g.id));
        }
      } else {
        setActionMessage({ type: "error", text: data.error || "Impossible de charger les groupes." });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setLoadingGroups(false);
    }
  };

  // 5. Diffusion
  const handleStartBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      alert("Veuillez saisir votre message de diffusion.");
      return;
    }
    if (selectedGroups.length === 0) {
      alert("Veuillez sélectionner au moins un groupe cible.");
      return;
    }

    setBroadcastStarting(true);
    setActionMessage(null);

    try {
      const token = getAuthToken();
      const res = await fetch("/api/bot/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: "start",
          message: broadcastMessage,
          targets: selectedGroups,
          mode: broadcastMode
        })
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: "success", text: `🚀 Diffusion lancée vers ${selectedGroups.length} groupe(s) !` });
        fetchStatusOnly();
      } else {
        setActionMessage({ type: "error", text: data.error || "Erreur lors du lancement." });
      }
    } catch (e: any) {
      setActionMessage({ type: "error", text: e.message });
    } finally {
      setBroadcastStarting(false);
    }
  };

  const handleBroadcastAction = async (action: "pause" | "resume" | "stop") => {
    try {
      const token = getAuthToken();
      const res = await fetch("/api/bot/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok) {
        fetchStatusOnly();
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  // 6. Sauvegarder IA Configuration
  const handleSaveAiConfig = async () => {
    setSavingAi(true);
    setActionMessage(null);
    try {
      const token = getAuthToken();
      const res = await fetch("/api/bot/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          aiEnabled,
          aiMode,
          systemPrompt,
          welcomeMessage,
          antiLink: antiLinkEnabled,
          antiSpam: antiSpamEnabled,
          antiViewOnce: antiViewOnceEnabled,
          blockedWords
        })
      });
      if (res.ok) {
        setActionMessage({ type: "success", text: "✅ Configuration de l'IA Gemini enregistrée !" });
      }
    } catch (e: any) {
      setActionMessage({ type: "error", text: e.message });
    } finally {
      setSavingAi(false);
    }
  };

  // 7. Téléchargement Média
  const handleDownloadMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrl.trim()) return;

    setDownloadingMedia(true);
    setActionMessage(null);
    try {
      const token = getAuthToken();
      const res = await fetch("/api/bot/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          url: mediaUrl.trim(),
          format: mediaFormat,
          quality: mediaQuality
        })
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: "success", text: "📥 Téléchargement en cours... Le fichier va arriver dans votre discussion WhatsApp privée !" });
        setMediaUrl("");
      } else {
        setActionMessage({ type: "error", text: data.error || "Erreur de téléchargement." });
      }
    } catch (e: any) {
      setActionMessage({ type: "error", text: e.message });
    } finally {
      setDownloadingMedia(false);
    }
  };

  // 8. Convertisseurs
  const handleConvertSticker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stickerUrl.trim()) return;
    setConvertingSticker(true);
    try {
      const token = getAuthToken();
      const res = await fetch("/api/bot/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: "sticker",
          imageUrl: stickerUrl.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: "success", text: "🎨 Sticker généré et envoyé sur votre WhatsApp !" });
        setStickerUrl("");
      } else {
        setActionMessage({ type: "error", text: data.error || "Erreur" });
      }
    } catch (e: any) {
      setActionMessage({ type: "error", text: e.message });
    } finally {
      setConvertingSticker(false);
    }
  };

  const handleGenerateTts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ttsText.trim()) return;
    setGeneratingTts(true);
    try {
      const token = getAuthToken();
      const res = await fetch("/api/bot/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: "tts",
          text: ttsText.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: "success", text: "🎙️ Note vocale WhatsApp envoyée dans votre chat !" });
        setTtsText("");
      } else {
        setActionMessage({ type: "error", text: data.error || "Erreur" });
      }
    } catch (e: any) {
      setActionMessage({ type: "error", text: e.message });
    } finally {
      setGeneratingTts(false);
    }
  };

  const isConnected = !!(botStatus?.connected);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="loading loading-spinner loading-lg text-primary"></div>
        <p className="mt-4 text-slate-400 font-medium">Chargement de votre Studio MyZapp...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Bot className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
                MyZapp Studio
              </span>
              <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                v2.5 Multi-Tenant
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Pill */}
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              isConnected 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
            }`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
              {isConnected ? "Connecté à WhatsApp" : "Bot Déconnecté"}
            </div>

            {/* Kill Switch Button */}
            <button
              onClick={handleStopAll}
              disabled={stoppingAll}
              className="btn btn-sm bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
              title="Arrêt d'urgence de toutes les diffusions et tâches"
            >
              <Square className="w-4 h-4 text-rose-400 fill-rose-400" />
              <span className="hidden md:inline font-bold">Arrêt d'urgence</span>
            </button>

            {/* Disconnect or Connect */}
            {isConnected ? (
              <button
                onClick={handleDisconnect}
                disabled={connectLoading}
                className="btn btn-sm btn-outline border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl"
              >
                <Power className="w-4 h-4 text-slate-400" />
                <span className="hidden md:inline">Déconnecter</span>
              </button>
            ) : (
              <button
                onClick={() => { setActiveTab("settings"); setShowStudio(true); }}
                className="btn btn-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold border-none rounded-xl shadow-lg shadow-emerald-500/20"
              >
                <Zap className="w-4 h-4" />
                <span>Connecter Bot</span>
              </button>
            )}

            <button
              onClick={() => {
                localStorage.removeItem("myzapp_token");
                router.push("/auth");
              }}
              className="btn btn-sm btn-ghost text-slate-400 hover:text-white p-2"
              title="Se déconnecter de l'application"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 overflow-x-auto no-scrollbar py-2 border-t border-slate-800/60">
          {[
            { id: "overview", label: "Vue d'ensemble", icon: Layers },
            { id: "broadcast", label: "Diffusion Sécurisée", icon: Send },
            { id: "ai", label: "IA Gemini & Chatbot", icon: Sparkles },
            { id: "downloader", label: "Médias 4K", icon: Download },
            { id: "moderation", label: "Sécurité & Groupes", icon: ShieldCheck },
            { id: "converters", label: "Stickers & Vocal", icon: Smile },
            { id: "settings", label: "Appairage & Paramètres", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Global Notifications Alert */}
        {actionMessage && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-xl animate-in fade-in slide-in-from-top-2 ${
            actionMessage.type === "success"
              ? "bg-emerald-950/60 border-emerald-500/30 text-emerald-200"
              : "bg-rose-950/60 border-rose-500/30 text-rose-200"
          }`}>
            <div className="flex items-center gap-3">
              {actionMessage.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span className="text-sm font-medium">{actionMessage.text}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: VUE D'ENSEMBLE (OVERVIEW) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Statut WhatsApp</span>
                  <Radio className={`w-5 h-5 ${isConnected ? "text-emerald-400 animate-pulse" : "text-rose-400"}`} />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white">{isConnected ? "En Ligne" : "Déconnecté"}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500 font-mono">{botStatus?.jid || "Aucun numéro appairé"}</p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">IA Gemini Auto</span>
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white">{aiEnabled ? "Actif" : "En Veille"}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Mode : {aiMode === "dm" ? "Privé uniquement" : "Tous les messages"}</p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Protection Anti-Ban</span>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white">Sécurisé</span>
                  <span className="text-xs text-emerald-400 font-bold">15m Pauses</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Anti-Spam & Anti-Lien actifs</p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Latence Serveur</span>
                  <Zap className="w-5 h-5 text-amber-400" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white">{botStatus?.stats?.ping || "24ms"}</span>
                  <span className="text-xs text-slate-400">{botStatus?.stats?.uptime || "Uptime 99.9%"}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">PostgreSQL Render + Vercel</p>
              </div>
            </div>

            {/* Live Broadcast Progress Card (if running or active) */}
            {broadcastState && broadcastState.status !== "idle" && (
              <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/30 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {broadcastState.status === "running" ? "⚡ Diffusion en cours" : broadcastState.status === "paused" ? "⏸️ En Pause" : "✅ Terminée"}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">Mode : {broadcastState.mode}</span>
                    </div>
                    <h3 className="mt-2 text-lg font-bold text-white">{broadcastState.statusText || "Campagne de diffusion"}</h3>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {broadcastState.isRunning && (
                      broadcastState.isPaused ? (
                        <button
                          onClick={() => handleBroadcastAction("resume")}
                          className="btn btn-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>Reprendre</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBroadcastAction("pause")}
                          className="btn btn-sm bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold border border-amber-500/30 rounded-xl"
                        >
                          <Pause className="w-4 h-4" />
                          <span>Mettre en pause</span>
                        </button>
                      )
                    )}
                    <button
                      onClick={() => handleBroadcastAction("stop")}
                      className="btn btn-sm bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-bold border border-rose-500/30 rounded-xl"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>Arrêter</span>
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-5 space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">Progression : {broadcastState.sentCount || 0} / {broadcastState.total || 0} envoyés</span>
                    <span className="text-emerald-400 font-mono">{broadcastState.progress || 0}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${broadcastState.progress || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Quick Action Hub */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div
                onClick={() => setActiveTab("broadcast")}
                className="bg-slate-900/40 hover:bg-slate-900 border border-slate-800/80 hover:border-emerald-500/40 rounded-3xl p-6 cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Send className="w-6 h-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                  Lancer une Diffusion
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Diffusez vos offres et annonces dans tous vos groupes WhatsApp avec protection anti-ban.
                </p>
              </div>

              <div
                onClick={() => setActiveTab("ai")}
                className="bg-slate-900/40 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/40 rounded-3xl p-6 cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                  IA Gemini & Chatbot
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Configurez le prompt système, le ton et les réponses automatiques de votre assistant IA.
                </p>
              </div>

              <div
                onClick={() => setActiveTab("downloader")}
                className="bg-slate-900/40 hover:bg-slate-900 border border-slate-800/80 hover:border-amber-500/40 rounded-3xl p-6 cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Film className="w-6 h-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                  Téléchargeur Médias 4K
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Téléchargez vidéos TikTok, YouTube et Reels et recevez-les directement sur votre WhatsApp.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: DIFFUSION SÉCURISÉE (BROADCAST STUDIO) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "broadcast" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Send className="w-6 h-6 text-emerald-400" />
                  Studio de Diffusion Ciblée & Anti-Ban
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Configurez votre message, sélectionnez vos groupes cibles et suivez l'avancement en direct avec pauses manuelles et automatiques.
                </p>
              </div>

              {/* Step 1: Message Composition */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-200">1. Message de Diffusion</label>
                  <span className="text-xs text-emerald-400 font-semibold">💡 Astuce : Utilisez le Spintax pour éviter les bans !</span>
                </div>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  rows={5}
                  placeholder="{Bonjour|Salut|Hello} chers membres, découvrez notre nouvelle offre spéciale MyZapp..."
                  className="textarea textarea-bordered w-full bg-slate-950 border-slate-700 text-white rounded-2xl focus:border-emerald-500 font-sans leading-relaxed"
                />
                
                {/* Generic Examples */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-400">Exemples rapides :</span>
                  <button
                    type="button"
                    onClick={() => setBroadcastMessage("{Bonjour|Salut} à tous ! 🚀\nProfitez de notre nouvelle promotion exclusive aujourd'hui.\nLien : https://myzapp.com")}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    Offre Promotionnelle
                  </button>
                  <button
                    type="button"
                    onClick={() => setBroadcastMessage("📢 *ANNONCE OFFICIELLE*\nChers membres, une mise à jour majeure est disponible pour notre service.\nMerci pour votre fidélité !")}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    Annonce de Groupe
                  </button>
                </div>
              </div>

              {/* Step 2: Target Groups Selection */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-sm font-bold text-slate-200">2. Sélection des Groupes Cibles ({selectedGroups.length} sélectionnés)</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFetchGroups}
                      disabled={loadingGroups || !isConnected}
                      className="btn btn-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingGroups ? "animate-spin" : ""}`} />
                      <span>{groups.length === 0 ? "Charger mes groupes" : "Actualiser groupes"}</span>
                    </button>
                    {groups.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedGroups.length === groups.length) {
                            setSelectedGroups([]);
                          } else {
                            setSelectedGroups(groups.map((g) => g.id));
                          }
                        }}
                        className="btn btn-xs btn-outline border-slate-700 text-slate-300 rounded-lg"
                      >
                        {selectedGroups.length === groups.length ? "Tout désélectionner" : "Tout sélectionner"}
                      </button>
                    )}
                  </div>
                </div>

                {groups.length === 0 ? (
                  <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl p-6 text-center space-y-2">
                    <Users className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-sm text-slate-400">
                      {isConnected 
                        ? "Cliquez sur « Charger mes groupes » pour récupérer la liste de vos groupes WhatsApp."
                        : "Connectez votre bot WhatsApp pour afficher vos groupes."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
                    {groups.map((grp) => {
                      const isSelected = selectedGroups.includes(grp.id);
                      return (
                        <div
                          key={grp.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedGroups(selectedGroups.filter((id) => id !== grp.id));
                            } else {
                              setSelectedGroups([...selectedGroups, grp.id]);
                            }
                          }}
                          className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                            isSelected
                              ? "bg-emerald-950/40 border-emerald-500/50 text-white"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                              isSelected ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400"
                            }`}>
                              {grp.subject?.charAt(0) || "G"}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-200 truncate">{grp.subject}</p>
                              <span className="text-[10px] text-slate-500">{grp.size} membres</span>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="checkbox checkbox-xs checkbox-primary rounded"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 3: Diffusion Mode Selection */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-200">3. Mode de Vitesse & Sécurité Anti-Ban</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    onClick={() => setBroadcastMode("business")}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      broadcastMode === "business"
                        ? "bg-emerald-950/50 border-emerald-500 shadow-lg shadow-emerald-500/10"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">Mode Business Anti-Ban</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400">Recommandé</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      Pauses automatiques de 15 minutes tous les 15-20 envois avec délais humains aléatoires.
                    </p>
                  </div>

                  <div
                    onClick={() => setBroadcastMode("normal")}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      broadcastMode === "normal"
                        ? "bg-emerald-950/50 border-emerald-500 shadow-lg shadow-emerald-500/10"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">Mode Normal</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-800 text-slate-300">Standard</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      Délais humains aléatoires de 4 à 10 secondes entre chaque groupe.
                    </p>
                  </div>

                  <div
                    onClick={() => setBroadcastMode("fast")}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      broadcastMode === "fast"
                        ? "bg-emerald-950/50 border-emerald-500 shadow-lg shadow-emerald-500/10"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">Mode Rapide</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-400">Groupes</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      Diffusion rapide avec 1 à 2 secondes de pause. À réserver aux groupes sans restriction.
                    </p>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <div className="pt-4 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleStartBroadcast}
                  disabled={broadcastStarting || !isConnected || selectedGroups.length === 0 || !broadcastMessage.trim()}
                  className="btn bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl px-8 shadow-xl shadow-emerald-500/20"
                >
                  <Send className="w-5 h-5" />
                  <span>{broadcastStarting ? "Lancement en cours..." : "Démarrer la Diffusion"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: IA GEMINI & CHATBOT */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "ai" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-indigo-400" />
                  Configuration de l'IA Gemini & Chatbot
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Définissez la personnalité et les réponses automatisées de votre bot WhatsApp propulsé par Google Gemini.
                </p>
              </div>

              {/* Toggle AI Active */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-white">Activer le Chatbot IA Gemini</span>
                  <p className="text-xs text-slate-400">Répond automatiquement aux messages entrants selon vos instructions</p>
                </div>
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                  className="toggle toggle-primary toggle-lg"
                />
              </div>

              {/* AI Scope Mode */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-200">Mode de Déclenchement</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { id: "dm", label: "Messages Privés (DM)", desc: "Répond uniquement dans les discussions 1-to-1" },
                    { id: "group", label: "Groupes Uniquement", desc: "Répond lorsqu'il est mentionné dans un groupe" },
                    { id: "all", label: "Partout (Privé & Groupes)", desc: "Répond à toutes les interactions" },
                  ].map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setAiMode(m.id as any)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        aiMode === m.id
                          ? "bg-indigo-950/40 border-indigo-500 text-white"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <span className="font-bold text-sm text-slate-200">{m.label}</span>
                      <p className="mt-1 text-xs text-slate-400">{m.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* System Prompt */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-200">System Prompt (Instructions Personnalisées)</label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={6}
                  placeholder="Tu es l'assistant commercial officiel de [Nom]. Réponds poliment en français, donne nos tarifs..."
                  className="textarea textarea-bordered w-full bg-slate-950 border-slate-700 text-white rounded-2xl focus:border-indigo-500 font-mono text-sm leading-relaxed"
                />
              </div>

              {/* Welcome Message */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-200">Message de Bienvenue Automatique</label>
                <input
                  type="text"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder="👋 Bonjour ! Merci pour votre message. Que puis-je faire pour vous ?"
                  className="input input-bordered w-full bg-slate-950 border-slate-700 text-white rounded-2xl focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveAiConfig}
                  disabled={savingAi}
                  className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl px-8 shadow-xl shadow-indigo-600/20"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{savingAi ? "Enregistrement..." : "Enregistrer les Réglages IA"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: TÉLÉCHARGEMENT MÉDIAS 4K */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "downloader" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Film className="w-6 h-6 text-amber-400" />
                  Studio Téléchargement 4K Médias Sociaux
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Collez n'importe quel lien YouTube, TikTok (sans logo), Instagram, Facebook ou Twitter. Le bot téléchargera le média et vous l'enverra directement dans votre discussion WhatsApp avec vous-même !
                </p>
              </div>

              <form onSubmit={handleDownloadMedia} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-200">Lien du Média</label>
                  <input
                    type="url"
                    required
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... ou https://vt.tiktok.com/..."
                    className="input input-bordered w-full bg-slate-950 border-slate-700 text-white rounded-2xl focus:border-amber-500 font-mono text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-200">Format</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMediaFormat("video")}
                        className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 ${
                          mediaFormat === "video"
                            ? "bg-amber-500 text-slate-950 border-amber-400"
                            : "bg-slate-950 text-slate-400 border-slate-800"
                        }`}
                      >
                        <Film className="w-4 h-4" />
                        <span>Vidéo MP4</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMediaFormat("mp3")}
                        className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 ${
                          mediaFormat === "mp3"
                            ? "bg-amber-500 text-slate-950 border-amber-400"
                            : "bg-slate-950 text-slate-400 border-slate-800"
                        }`}
                      >
                        <Music className="w-4 h-4" />
                        <span>Audio MP3</span>
                      </button>
                    </div>
                  </div>

                  {mediaFormat === "video" && (
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-200">Résolution</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["360p", "720p", "1080p"].map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => setMediaQuality(q as any)}
                            className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center ${
                              mediaQuality === q
                                ? "bg-amber-500/20 text-amber-300 border-amber-500"
                                : "bg-slate-950 text-slate-400 border-slate-800"
                            }`}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-3">
                  <Radio className="w-5 h-5 shrink-0" />
                  <span>
                    <strong>Canal Direct :</strong> Le fichier téléchargé sera envoyé en haute définition sur le numéro WhatsApp connecté <code>{botStatus?.jid || "votre compte"}</code>.
                  </span>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={downloadingMedia || !isConnected || !mediaUrl.trim()}
                    className="btn bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl px-8 shadow-xl shadow-amber-500/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>{downloadingMedia ? "Téléchargement & Envoi..." : "Télécharger & Envoyer sur mon WhatsApp"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: SÉCURITÉ & MODÉRATION DE GROUPES */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "moderation" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  Sécurité, Anti-Spam & Anti-Vue Unique
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Protégez vos groupes contre les liens frauduleux, le spam et capturez automatiquement les messages éphémères en vue unique.
                </p>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-white">Anti-Lien Auto</span>
                    <p className="text-xs text-slate-400">Supprime les liens publicitaires</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={antiLinkEnabled}
                    onChange={(e) => setAntiLinkEnabled(e.target.checked)}
                    className="toggle toggle-primary"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-white">Anti-Spam / Flood</span>
                    <p className="text-xs text-slate-400">Bloque les messages répétitifs</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={antiSpamEnabled}
                    onChange={(e) => setAntiSpamEnabled(e.target.checked)}
                    className="toggle toggle-primary"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-white">Anti-Vue Unique Auto</span>
                    <p className="text-xs text-slate-400">Reçoit les photos éphémères en privé</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={antiViewOnceEnabled}
                    onChange={(e) => setAntiViewOnceEnabled(e.target.checked)}
                    className="toggle toggle-primary"
                  />
                </div>
              </div>

              {/* Blocked Words Management */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-200">Mots Clés & Termes Interdits</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newWordInput}
                    onChange={(e) => setNewWordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newWordInput.trim()) {
                        e.preventDefault();
                        if (!blockedWords.includes(newWordInput.trim().toLowerCase())) {
                          setBlockedWords([...blockedWords, newWordInput.trim().toLowerCase()]);
                        }
                        setNewWordInput("");
                      }
                    }}
                    placeholder="Ajouter un mot clé (ex: scam, arnaque, telegram)..."
                    className="input input-bordered flex-1 bg-slate-950 border-slate-700 text-white rounded-2xl focus:border-emerald-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newWordInput.trim() && !blockedWords.includes(newWordInput.trim().toLowerCase())) {
                        setBlockedWords([...blockedWords, newWordInput.trim().toLowerCase()]);
                        setNewWordInput("");
                      }
                    }}
                    className="btn bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ajouter</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {blockedWords.map((word) => (
                    <span
                      key={word}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-2"
                    >
                      <span>{word}</span>
                      <button
                        type="button"
                        onClick={() => setBlockedWords(blockedWords.filter((w) => w !== word))}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveAiConfig}
                  disabled={savingModeration}
                  className="btn bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl px-8 shadow-xl shadow-emerald-500/20"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{savingModeration ? "Enregistrement..." : "Enregistrer la Modération"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 6: CONVERTISSEURS (STICKERS & TTS VOCAL) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "converters" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
            {/* Sticker Maker */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-5 shadow-xl">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Smile className="w-5 h-5 text-emerald-400" />
                  Créateur de Sticker WhatsApp
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Collez le lien d'une image pour recevoir instantanément un sticker animé ou statique sur votre WhatsApp.
                </p>
              </div>

              <form onSubmit={handleConvertSticker} className="space-y-4">
                <input
                  type="url"
                  required
                  value={stickerUrl}
                  onChange={(e) => setStickerUrl(e.target.value)}
                  placeholder="https://example.com/image.png ou .jpg"
                  className="input input-bordered w-full bg-slate-950 border-slate-700 text-white rounded-2xl focus:border-emerald-500 text-sm font-mono"
                />
                <button
                  type="submit"
                  disabled={convertingSticker || !isConnected || !stickerUrl.trim()}
                  className="btn w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl"
                >
                  <Smile className="w-4 h-4" />
                  <span>{convertingSticker ? "Création du Sticker..." : "Créer & Envoyer sur mon WhatsApp"}</span>
                </button>
              </form>
            </div>

            {/* Text to Speech Voice Note */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-5 shadow-xl">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Mic className="w-5 h-5 text-indigo-400" />
                  Synthèse Vocale (Note Vocale)
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Saisissez votre texte pour le recevoir sous forme de note vocale audio directement sur votre WhatsApp.
                </p>
              </div>

              <form onSubmit={handleGenerateTts} className="space-y-4">
                <textarea
                  required
                  rows={3}
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  placeholder="Bonjour, ceci est un message vocal automatique généré par MyZapp..."
                  className="textarea textarea-bordered w-full bg-slate-950 border-slate-700 text-white rounded-2xl focus:border-indigo-500 text-sm"
                />
                <button
                  type="submit"
                  disabled={generatingTts || !isConnected || !ttsText.trim()}
                  className="btn w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{generatingTts ? "Génération de la voix..." : "Générer & Envoyer la Note Vocale"}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 7: APPAIRAGE & PARAMÈTRES */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "settings" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Settings className="w-6 h-6 text-slate-300" />
                  Passerelle d'Appairage & Paramètres
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Générez votre session WhatsApp sécurisée via QR Code ou Code d'appairage à 8 chiffres.
                </p>
              </div>

              {/* Studio Toggle Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => { setShowStudio(true); setStudioMethod("qr"); }}
                  className={`btn rounded-2xl ${studioMethod === "qr" && showStudio ? "bg-emerald-500 text-slate-950" : "btn-outline border-slate-700 text-slate-300"}`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>Appairage par QR Code</span>
                </button>
                <button
                  onClick={() => { setShowStudio(true); setStudioMethod("pair"); }}
                  className={`btn rounded-2xl ${studioMethod === "pair" && showStudio ? "bg-emerald-500 text-slate-950" : "btn-outline border-slate-700 text-slate-300"}`}
                >
                  <Phone className="w-4 h-4" />
                  <span>Code par Numéro de Téléphone</span>
                </button>
              </div>

              {/* Iframe Studio Container */}
              {showStudio && (
                <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 p-2 space-y-3">
                  <div className="bg-slate-900 px-4 py-2 rounded-xl flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>Passerelle Sécurisée MyZapp Authenticator [Canal Direct SSL]</span>
                    <button onClick={() => setShowStudio(false)} className="hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="h-[450px] w-full bg-white rounded-xl overflow-hidden">
                    <iframe
                      src={studioMethod === "qr" ? "https://session.rgnk.site/qr-code" : "https://session.rgnk.site/pairing-code"}
                      className="w-full h-full border-0"
                      title="MyZapp Authenticator SSL Gateway"
                    />
                  </div>
                </div>
              )}

              {/* Manual Session Code Input */}
              <form onSubmit={handleConnectSession} className="space-y-3 pt-4 border-t border-slate-800">
                <label className="text-sm font-bold text-slate-200">Coller votre Code de Session (RGNK~...)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={sessionInput}
                    onChange={(e) => setSessionInput(e.target.value)}
                    placeholder="RGNK~xxxxxxxxxxxxxxxxxxxx"
                    className="input input-bordered flex-1 bg-slate-950 border-slate-700 text-white rounded-2xl focus:border-emerald-500 font-mono text-sm"
                  />
                  <button
                    type="submit"
                    disabled={connectLoading || !sessionInput.trim()}
                    className="btn bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl px-6"
                  >
                    <Zap className="w-4 h-4" />
                    <span>{connectLoading ? "Connexion..." : "Lier la Session"}</span>
                  </button>
                </div>
              </form>

              {/* Disconnect Action */}
              {isConnected && (
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-sm font-bold text-rose-400">Zone de Danger</span>
                    <p className="text-xs text-slate-500">Déconnecter le bot effacera la session active sur nos serveurs.</p>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    disabled={connectLoading}
                    className="btn btn-sm bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl"
                  >
                    <Power className="w-4 h-4" />
                    <span>Déconnecter ce Bot</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
