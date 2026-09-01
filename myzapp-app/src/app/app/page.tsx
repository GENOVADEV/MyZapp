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
  User,
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
  Volume2,
  Loader2,
  AlertTriangle
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
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

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

    // Poll status every 4 seconds for realtime feedback
    pollingRef.current = setInterval(() => {
      fetchStatusOnly();
    }, 4000);

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
        setBotStatus((prev: any) => ({ ...prev, connected: false, session: null, status: 'disconnected', jid: null }));
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
        setActionMessage({ type: "info", text: "⏳ Initialisation de la session... Authentification WhatsApp en cours..." });
        setShowStudio(false);
        setSessionInput("");
        setBotStatus((prev: any) => ({ ...prev, status: 'connecting', session: data.session }));
        
        // Rapid status refresh
        setTimeout(() => fetchStatusOnly(), 1500);
        setTimeout(() => fetchStatusOnly(), 4000);
      } else {
        setActionMessage({ type: "error", text: data.error || "Erreur lors de la liaison de la session." });
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
    setActionMessage(null);
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
        setActionMessage({ type: "error", text: data.error || "Impossible de charger les groupes. Vérifiez que le bot est bien connecté." });
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
        setActionMessage({ type: "error", text: data.error || "Erreur lors du lancement de la diffusion." });
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
        setActionMessage({ type: "success", text: "✅ Configuration de l'IA Gemini enregistrée avec succès !" });
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
        setActionMessage({ type: "success", text: "📥 Téléchargement lancé ! Le fichier sera envoyé directement dans votre discussion WhatsApp privée." });
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
    setActionMessage(null);
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
        setActionMessage({ type: "error", text: data.error || "Erreur lors de la création du sticker." });
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
    setActionMessage(null);
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
        setActionMessage({ type: "success", text: "🎙️ Note vocale WhatsApp envoyée dans votre chat privé !" });
        setTtsText("");
      } else {
        setActionMessage({ type: "error", text: data.error || "Erreur lors de la génération vocale." });
      }
    } catch (e: any) {
      setActionMessage({ type: "error", text: e.message });
    } finally {
      setGeneratingTts(false);
    }
  };

  const isConnected = !!(botStatus?.connected);
  const isConnecting = botStatus?.status === "connecting";
  const hasError = botStatus?.status === "error" || (botStatus?.session && !isConnected && !isConnecting);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white px-4">
        <div className="loading loading-spinner loading-lg text-emerald-400"></div>
        <p className="mt-4 text-slate-400 font-medium text-center">Chargement de votre Studio MyZapp...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black overflow-x-hidden">
      {/* ------------------------------------------------------------- */}
      {/* TOP RESPONSIVE HEADER (STUDIO EXCLUSIF) */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="navbar min-h-14 p-0 justify-between gap-2">
            {/* Logo & Brand + Live Status Badge */}
            <div className="navbar-start w-auto flex items-center gap-2 sm:gap-3 min-w-0">
              <Link href="/app" className="flex items-center gap-2 sm:gap-2.5 min-w-0 group">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0 group-hover:scale-105 transition-transform">
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm sm:text-base font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent truncate">
                      MyZapp Studio
                    </span>
                  </div>
                  <span className="hidden sm:block text-[9px] text-emerald-400 font-bold uppercase tracking-wider">
                    v6.2 Multi-Tenant
                  </span>
                </div>
              </Link>

              {/* Realtime Live Status Pill */}
              <div className="shrink-0">
                <span className={`badge badge-xs sm:badge-sm gap-1 font-semibold ${
                  isConnected 
                    ? "badge-success text-slate-950 font-bold" 
                    : isConnecting 
                    ? "badge-warning text-slate-950 animate-pulse font-bold" 
                    : "badge-ghost border-rose-500/30 text-rose-400 bg-rose-500/10"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isConnected ? "bg-emerald-950 animate-ping" : isConnecting ? "bg-amber-950" : "bg-rose-400"
                  }`} />
                  <span className="hidden xs:inline text-[10px]">
                    {isConnected ? "En ligne" : isConnecting ? "Connexion..." : "Déconnecté"}
                  </span>
                </span>
              </div>
            </div>

            {/* Quick Header Actions + User Profile Menu */}
            <div className="navbar-end w-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Kill Switch Button */}
              <button
                onClick={handleStopAll}
                disabled={stoppingAll}
                className="btn btn-xs sm:btn-sm bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl flex items-center gap-1 transition-all"
                title="Arrêt d'urgence de toutes les diffusions et tâches"
              >
                <Square className="w-3.5 h-3.5 fill-rose-400 shrink-0" />
                <span className="hidden sm:inline font-bold text-xs">Arrêt</span>
                <span className="hidden md:inline font-bold text-xs">d'urgence</span>
              </button>

              {/* Connection Toggle Action */}
              {isConnected ? (
                <button
                  onClick={handleDisconnect}
                  disabled={connectLoading}
                  className="btn btn-xs sm:btn-sm btn-outline border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl flex items-center gap-1"
                  title="Déconnecter WhatsApp"
                >
                  <Power className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline text-xs">Déconnecter</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowStudio(true)}
                  className="btn btn-xs sm:btn-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black border-none rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-1"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span className="text-xs">Connecter</span>
                </button>
              )}

              {/* User Profile Dropdown Menu */}
              <div className="dropdown dropdown-end">
                <button
                  tabIndex={0}
                  role="button"
                  className="btn btn-xs sm:btn-sm btn-ghost btn-circle text-slate-300 hover:text-white"
                  aria-label="Menu profil utilisateur"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-emerald-400">
                    {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                  </div>
                </button>
                <ul
                  tabIndex={0}
                  className="dropdown-content z-50 menu p-2 shadow-2xl bg-slate-900 border border-slate-800 rounded-2xl w-56 space-y-1 mt-2"
                >
                  <li className="menu-title px-3 py-1.5 text-slate-400 text-[11px] font-semibold border-b border-slate-800">
                    <div className="truncate text-white font-bold">{user?.name || "Utilisateur MyZapp"}</div>
                    <div className="truncate text-[10px] text-slate-400">{user?.email || ""}</div>
                  </li>
                  <li>
                    <Link href="/" className="text-xs text-slate-300 hover:text-white py-2 rounded-xl flex items-center gap-2">
                      <Bot className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Accueil Landing</span>
                    </Link>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveTab("settings")}
                      className="text-xs text-slate-300 hover:text-white py-2 rounded-xl flex items-center gap-2"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      <span>Appairage & Paramètres</span>
                    </button>
                  </li>
                  <li className="border-t border-slate-800 pt-1">
                    <button
                      onClick={() => {
                        localStorage.removeItem("myzapp_token");
                        localStorage.removeItem("myzapp_user");
                        router.push("/auth");
                      }}
                      className="text-xs text-rose-400 hover:bg-rose-500/10 py-2 rounded-xl flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Se déconnecter</span>
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Responsive Horizontal Scroll Tabs Bar */}
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 border-t border-slate-800/60 overflow-hidden">
          <div className="flex space-x-1.5 overflow-x-auto no-scrollbar py-2 -mx-1 px-1">
            {[
              { id: "overview", label: "Vue d'ensemble", icon: Layers },
              { id: "broadcast", label: "Diffusion", icon: Send },
              { id: "ai", label: "IA Gemini", icon: Sparkles },
              { id: "downloader", label: "Médias 4K", icon: Download },
              { id: "moderation", label: "Sécurité", icon: ShieldCheck },
              { id: "converters", label: "Stickers & Vocal", icon: Smile },
              { id: "settings", label: "Appairage", icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs whitespace-nowrap transition-all shrink-0 ${
                    isActive
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 font-semibold"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* MAIN CONTAINER */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5">
        {/* Realtime Live Status Banner */}
        {isConnecting && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200 flex items-center justify-between gap-3 shadow-lg animate-pulse">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
              <div className="text-xs sm:text-sm">
                <strong className="font-bold text-amber-300">Authentification WhatsApp en cours...</strong>
                <p className="text-amber-400/80">Le bot négocie la connexion avec les serveurs WhatsApp. Actualisation automatique.</p>
              </div>
            </div>
            <button
              onClick={fetchStatusOnly}
              className="btn btn-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shrink-0"
            >
              Vérifier
            </button>
          </div>
        )}

        {hasError && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <div className="text-xs sm:text-sm">
                <strong className="font-bold text-rose-300">Session WhatsApp déconnectée ou expirée</strong>
                <p className="text-rose-400/80">{botStatus?.error || "Veuillez reconnecter votre compte WhatsApp via QR code ou code d'appairage."}</p>
              </div>
            </div>
            <button
              onClick={() => { setActiveTab("settings"); setShowStudio(true); }}
              className="btn btn-xs bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-lg shrink-0 self-start sm:self-auto"
            >
              Reconnecter
            </button>
          </div>
        )}

        {/* Global Notifications Alert */}
        {actionMessage && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-xl animate-in fade-in slide-in-from-top-2 ${
            actionMessage.type === "success"
              ? "bg-emerald-950/70 border-emerald-500/30 text-emerald-200"
              : actionMessage.type === "info"
              ? "bg-sky-950/70 border-sky-500/30 text-sky-200"
              : "bg-rose-950/70 border-rose-500/30 text-rose-200"
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              {actionMessage.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : actionMessage.type === "info" ? (
                <Loader2 className="w-5 h-5 text-sky-400 animate-spin shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span className="text-xs sm:text-sm font-medium break-words">{actionMessage.text}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white shrink-0 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: VUE D'ENSEMBLE (OVERVIEW) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "overview" && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Card 1: Statut WhatsApp */}
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Statut WhatsApp</span>
                  <Radio className={`w-4 h-4 ${isConnected ? "text-emerald-400 animate-pulse" : isConnecting ? "text-amber-400 animate-spin" : "text-rose-400"}`} />
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-black text-white">
                    {isConnected ? "En Ligne" : isConnecting ? "Connexion..." : "Déconnecté"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400 font-mono truncate">
                  {botStatus?.jid ? `+${botStatus.jid.split('@')[0]}` : "Aucun numéro appairé"}
                </p>
              </div>

              {/* Card 2: IA Gemini */}
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">IA Gemini Auto</span>
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-black text-white">{aiEnabled ? "Actif" : "En Veille"}</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400 truncate">Mode : {aiMode === "dm" ? "Privé (DM)" : "Tous messages"}</p>
              </div>

              {/* Card 3: Protection Anti-Ban */}
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Anti-Ban & Anti-Vue</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-black text-white">Sécurisé</span>
                  <span className="text-[10px] text-emerald-400 font-bold">15m Pauses</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Anti-Spam & Vue Unique ON</p>
              </div>

              {/* Card 4: Latence Serveur */}
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Serveur Render</span>
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-black text-white">{botStatus?.stats?.ping || "24ms"}</span>
                  <span className="text-xs text-slate-400">{botStatus?.stats?.uptime || "99.9%"}</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">PostgreSQL Cloud Sync</p>
              </div>
            </div>

            {/* Live Broadcast Progress Banner */}
            {broadcastState && broadcastState.status !== "idle" && (
              <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/40 border border-emerald-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {broadcastState.status === "running" ? "⚡ Diffusion active" : broadcastState.status === "paused" ? "⏸️ En Pause" : "✅ Terminée"}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">Mode : {broadcastState.mode}</span>
                    </div>
                    <h3 className="mt-1.5 text-base sm:text-lg font-bold text-white break-words">
                      {broadcastState.statusText || "Campagne de diffusion en cours"}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {broadcastState.isRunning && (
                      broadcastState.isPaused ? (
                        <button
                          onClick={() => handleBroadcastAction("resume")}
                          className="btn btn-xs sm:btn-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Reprendre</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBroadcastAction("pause")}
                          className="btn btn-xs sm:btn-sm bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold border border-amber-500/30 rounded-xl"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause</span>
                        </button>
                      )
                    )}
                    <button
                      onClick={() => handleBroadcastAction("stop")}
                      className="btn btn-xs sm:btn-sm bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-bold border border-rose-500/30 rounded-xl"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Arrêter</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">Progression : {broadcastState.sentCount || 0} / {broadcastState.total || 0}</span>
                    <span className="text-emerald-400 font-mono">{broadcastState.progress || 0}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${broadcastState.progress || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Quick Action Navigation Hub */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                onClick={() => setActiveTab("broadcast")}
                className="bg-slate-900/40 hover:bg-slate-900 border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl p-5 cursor-pointer transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Send className="w-5 h-5" />
                </div>
                <h3 className="mt-3 text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                  Diffusion Sécurisée
                </h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Diffusez vos messages dans tous vos groupes WhatsApp avec protection anti-ban et pauses 15m.
                </p>
              </div>

              <div
                onClick={() => setActiveTab("ai")}
                className="bg-slate-900/40 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/40 rounded-2xl p-5 cursor-pointer transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="mt-3 text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                  IA Gemini & Chatbot
                </h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Personnalisez le prompt système, le persona commercial et le message de bienvenue automatique.
                </p>
              </div>

              <div
                onClick={() => setActiveTab("downloader")}
                className="bg-slate-900/40 hover:bg-slate-900 border border-slate-800/80 hover:border-amber-500/40 rounded-2xl p-5 cursor-pointer transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Film className="w-5 h-5" />
                </div>
                <h3 className="mt-3 text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                  Téléchargeur 4K
                </h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Téléchargez vidéos TikTok sans logo, YouTube MP3/MP4 et recevez-les directement sur votre WhatsApp.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: DIFFUSION SÉCURISÉE (BROADCAST STUDIO) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "broadcast" && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 space-y-5 shadow-xl">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <Send className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                  Studio de Diffusion Ciblée
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-400">
                  Sélectionnez vos groupes, rédigez votre message avec spintax et contrôlez l'envoi avec pauses manuelles et automatiques.
                </p>
              </div>

              {/* Step 1: Message */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs sm:text-sm font-bold text-slate-200">1. Message de Diffusion</label>
                  <span className="text-[11px] text-emerald-400 font-semibold">💡 Spintax supporté : {'{Bonjour|Salut}'}</span>
                </div>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  rows={4}
                  placeholder="{Bonjour|Salut|Hello} chers membres, découvrez notre nouvelle offre spéciale..."
                  className="textarea textarea-bordered w-full bg-slate-950 border-slate-700 text-white rounded-2xl focus:border-emerald-500 text-xs sm:text-sm leading-relaxed"
                />
                
                {/* Generic Examples */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] text-slate-400">Modèles rapides :</span>
                  <button
                    type="button"
                    onClick={() => setBroadcastMessage("{Bonjour|Salut} à tous ! 🚀\nProfitez de notre nouvelle offre spéciale MyZapp aujourd'hui.\nLien : https://myzapp.com")}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700"
                  >
                    Promotion Spintax
                  </button>
                  <button
                    type="button"
                    onClick={() => setBroadcastMessage("📢 *ANNONCE OFFICIELLE*\nChers membres, une mise à jour majeure est disponible.\nMerci pour votre fidélité !")}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700"
                  >
                    Annonce de Groupe
                  </button>
                </div>
              </div>

              {/* Step 2: Target Groups Selection */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-200">
                    2. Groupes Cibles ({selectedGroups.length} sélectionnés)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFetchGroups}
                      disabled={loadingGroups || !isConnected}
                      className="btn btn-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingGroups ? "animate-spin" : ""}`} />
                      <span>{groups.length === 0 ? "Charger mes groupes" : "Actualiser"}</span>
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
                  <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl p-5 text-center space-y-1.5">
                    <Users className="w-6 h-6 text-slate-500 mx-auto" />
                    <p className="text-xs text-slate-400">
                      {isConnected 
                        ? "Cliquez sur « Charger mes groupes » pour récupérer la liste de vos groupes WhatsApp."
                        : "Connectez d'abord votre bot WhatsApp pour afficher vos groupes."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
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
                          className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                            isSelected
                              ? "bg-emerald-950/50 border-emerald-500/50 text-white"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
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
                            className="checkbox checkbox-xs checkbox-primary rounded shrink-0 ml-2"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 3: Speed Modes */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-bold text-slate-200">3. Mode de Sécurité Anti-Ban</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div
                    onClick={() => setBroadcastMode("business")}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      broadcastMode === "business"
                        ? "bg-emerald-950/50 border-emerald-500 shadow-md shadow-emerald-500/10"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">Mode Business</span>
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-emerald-500/20 text-emerald-400">Recommandé</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Pauses de 15 minutes tous les 15-20 envois avec délais humains aléatoires.
                    </p>
                  </div>

                  <div
                    onClick={() => setBroadcastMode("normal")}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      broadcastMode === "normal"
                        ? "bg-emerald-950/50 border-emerald-500 shadow-md shadow-emerald-500/10"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">Mode Normal</span>
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-slate-800 text-slate-300">Standard</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Délais humains de 4 à 10 secondes entre chaque groupe.
                    </p>
                  </div>

                  <div
                    onClick={() => setBroadcastMode("fast")}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      broadcastMode === "fast"
                        ? "bg-emerald-950/50 border-emerald-500 shadow-md shadow-emerald-500/10"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">Mode Rapide</span>
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-500/20 text-amber-400">Groupes</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Envoi rapide (1-2s). Réservé aux groupes sans restriction.
                    </p>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleStartBroadcast}
                  disabled={broadcastStarting || !isConnected || selectedGroups.length === 0 || !broadcastMessage.trim()}
                  className="btn btn-sm sm:btn-md w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl px-6 shadow-lg shadow-emerald-500/20"
                >
                  <Send className="w-4 h-4" />
                  <span>{broadcastStarting ? "Lancement..." : "Démarrer la Diffusion"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: IA GEMINI & CHATBOT */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "ai" && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 space-y-5 shadow-xl">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
                  IA Gemini & Chatbot Intelligent
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-400">
                  Définissez la personnalité et les réponses automatiques de votre bot WhatsApp propulsé par Google Gemini.
                </p>
              </div>

              {/* Toggle AI */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-xs sm:text-sm font-bold text-white">Activer l'IA Gemini</span>
                  <p className="text-[11px] text-slate-400">Répond automatiquement aux messages entrants</p>
                </div>
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                  className="toggle toggle-primary"
                />
              </div>

              {/* Mode */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-slate-200">Mode de Déclenchement</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: "dm", label: "Messages Privés (DM)", desc: "Répond uniquement en direct 1-to-1" },
                    { id: "group", label: "Groupes", desc: "Répond lorsqu'il est mentionné" },
                    { id: "all", label: "Partout", desc: "Répond à toutes les interactions" },
                  ].map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setAiMode(m.id as any)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        aiMode === m.id
                          ? "bg-indigo-950/50 border-indigo-500 text-white"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <span className="font-bold text-xs text-slate-200">{m.label}</span>
                      <p className="mt-0.5 text-[11px] text-slate-400">{m.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* System Prompt */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-slate-200">Prompt Système (Instructions)</label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={4}
                  placeholder="Tu es l'assistant commercial officiel de [Nom]. Réponds poliment en français..."
                  className="textarea textarea-bordered w-full bg-slate-950 border-slate-700 text-white rounded-xl focus:border-indigo-500 text-xs sm:text-sm leading-relaxed font-mono"
                />
              </div>

              {/* Welcome Message */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-slate-200">Message de Bienvenue Automatique</label>
                <input
                  type="text"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder="👋 Bonjour ! Merci pour votre message..."
                  className="input input-bordered w-full bg-slate-950 border-slate-700 text-white rounded-xl focus:border-indigo-500 text-xs sm:text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveAiConfig}
                  disabled={savingAi}
                  className="btn btn-sm sm:btn-md w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl px-6"
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
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 space-y-5 shadow-xl">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <Film className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                  Studio Téléchargement Médias 4K
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-400">
                  Collez n'importe quel lien YouTube, TikTok sans filigrane, Instagram Reels ou Facebook. Le bot téléchargera le média et vous l'enverra directement dans votre discussion WhatsApp avec vous-même !
                </p>
              </div>

              <form onSubmit={handleDownloadMedia} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-slate-200">Lien du Média</label>
                  <input
                    type="url"
                    required
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... ou https://vt.tiktok.com/..."
                    className="input input-bordered w-full bg-slate-950 border-slate-700 text-white rounded-xl focus:border-amber-500 font-mono text-xs sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-slate-200">Format</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMediaFormat("video")}
                        className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 ${
                          mediaFormat === "video"
                            ? "bg-amber-500 text-slate-950 border-amber-400"
                            : "bg-slate-950 text-slate-400 border-slate-800"
                        }`}
                      >
                        <Film className="w-3.5 h-3.5" />
                        <span>Vidéo MP4</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMediaFormat("mp3")}
                        className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 ${
                          mediaFormat === "mp3"
                            ? "bg-amber-500 text-slate-950 border-amber-400"
                            : "bg-slate-950 text-slate-400 border-slate-800"
                        }`}
                      >
                        <Music className="w-3.5 h-3.5" />
                        <span>Audio MP3</span>
                      </button>
                    </div>
                  </div>

                  {mediaFormat === "video" && (
                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-bold text-slate-200">Qualité</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["360p", "720p", "1080p"].map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => setMediaQuality(q as any)}
                            className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center ${
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

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2.5">
                  <Radio className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>Canal Direct :</strong> Le fichier sera expédié sur votre propre WhatsApp <code>{botStatus?.jid ? `(+${botStatus.jid.split('@')[0]})` : ""}</code>.
                  </span>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={downloadingMedia || !isConnected || !mediaUrl.trim()}
                    className="btn btn-sm sm:btn-md w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl px-6"
                  >
                    <Download className="w-4 h-4" />
                    <span>{downloadingMedia ? "Téléchargement..." : "Télécharger & Recevoir sur WhatsApp"}</span>
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
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 space-y-5 shadow-xl">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                  Sécurité, Anti-Spam & Anti-Vue Unique
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-400">
                  Protégez vos groupes contre les liens frauduleux, le spam et capturez automatiquement les messages éphémères en vue unique.
                </p>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-white">Anti-Lien Auto</span>
                    <p className="text-[11px] text-slate-400">Supprime les pubs</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={antiLinkEnabled}
                    onChange={(e) => setAntiLinkEnabled(e.target.checked)}
                    className="toggle toggle-primary"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-white">Anti-Spam / Flood</span>
                    <p className="text-[11px] text-slate-400">Bloque le flood</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={antiSpamEnabled}
                    onChange={(e) => setAntiSpamEnabled(e.target.checked)}
                    className="toggle toggle-primary"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-white">Anti-Vue Unique</span>
                    <p className="text-[11px] text-slate-400">Reçoit médias privés</p>
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
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-bold text-slate-200">Mots Clés & Termes Interdits</label>
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
                    placeholder="Ajouter un mot clé (ex: scam, arnaque)..."
                    className="input input-bordered flex-1 bg-slate-950 border-slate-700 text-white rounded-xl focus:border-emerald-500 text-xs sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newWordInput.trim() && !blockedWords.includes(newWordInput.trim().toLowerCase())) {
                        setBlockedWords([...blockedWords, newWordInput.trim().toLowerCase()]);
                        setNewWordInput("");
                      }
                    }}
                    className="btn btn-sm sm:btn-md bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ajouter</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {blockedWords.map((word) => (
                    <span
                      key={word}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <span>{word}</span>
                      <button
                        type="button"
                        onClick={() => setBlockedWords(blockedWords.filter((w) => w !== word))}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
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
                  className="btn btn-sm sm:btn-md w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl px-6"
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 animate-in fade-in duration-300">
            {/* Sticker Maker */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Smile className="w-5 h-5 text-emerald-400" />
                  Créateur de Sticker WhatsApp
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Collez le lien d'une image pour recevoir instantanément un sticker animé ou statique dans votre WhatsApp.
                </p>
              </div>

              <form onSubmit={handleConvertSticker} className="space-y-3">
                <input
                  type="url"
                  required
                  value={stickerUrl}
                  onChange={(e) => setStickerUrl(e.target.value)}
                  placeholder="https://example.com/image.png ou .jpg"
                  className="input input-bordered w-full bg-slate-950 border-slate-700 text-white rounded-xl focus:border-emerald-500 text-xs sm:text-sm font-mono"
                />
                <button
                  type="submit"
                  disabled={convertingSticker || !isConnected || !stickerUrl.trim()}
                  className="btn btn-sm sm:btn-md w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl"
                >
                  <Smile className="w-4 h-4" />
                  <span>{convertingSticker ? "Création..." : "Créer & Envoyer sur WhatsApp"}</span>
                </button>
              </form>
            </div>

            {/* Text to Speech Voice Note */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Mic className="w-5 h-5 text-indigo-400" />
                  Synthèse Vocale (Note Vocale)
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Saisissez votre texte pour le recevoir sous forme de note vocale audio directement sur votre WhatsApp.
                </p>
              </div>

              <form onSubmit={handleGenerateTts} className="space-y-3">
                <textarea
                  required
                  rows={2}
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  placeholder="Bonjour, ceci est une note vocale automatique..."
                  className="textarea textarea-bordered w-full bg-slate-950 border-slate-700 text-white rounded-xl focus:border-indigo-500 text-xs sm:text-sm"
                />
                <button
                  type="submit"
                  disabled={generatingTts || !isConnected || !ttsText.trim()}
                  className="btn btn-sm sm:btn-md w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{generatingTts ? "Génération..." : "Générer & Envoyer la Note Vocale"}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 7: APPAIRAGE & PARAMÈTRES */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "settings" && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 space-y-5 shadow-xl">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300" />
                  Passerelle d'Appairage & Paramètres
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-400">
                  Générez votre session WhatsApp sécurisée via QR Code ou Code d'appairage à 8 chiffres.
                </p>
              </div>

              {/* Studio Toggle Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={() => { setStudioMethod("qr"); setShowStudio(true); }}
                  className="btn btn-sm sm:btn-md bg-emerald-500/10 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/30 rounded-xl flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Ouvrir l'Appairage par QR Code</span>
                </button>
                <button
                  onClick={() => { setStudioMethod("pair"); setShowStudio(true); }}
                  className="btn btn-sm sm:btn-md btn-outline border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  <span>Code par Numéro de Téléphone</span>
                </button>
              </div>

              {/* Manual Session Code Input */}
              <form onSubmit={handleConnectSession} className="space-y-2.5 pt-3 border-t border-slate-800">
                <label className="text-xs sm:text-sm font-bold text-slate-200">Coller votre Code de Session (RGNK~...)</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    value={sessionInput}
                    onChange={(e) => setSessionInput(e.target.value)}
                    placeholder="RGNK~xxxxxxxxxxxxxxxxxxxx"
                    className="input input-bordered flex-1 bg-slate-950 border-slate-700 text-white rounded-xl focus:border-emerald-500 font-mono text-xs sm:text-sm"
                  />
                  <button
                    type="submit"
                    disabled={connectLoading || !sessionInput.trim()}
                    className="btn btn-sm sm:btn-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl px-6 shrink-0"
                  >
                    <Zap className="w-4 h-4" />
                    <span>{connectLoading ? "Liaison..." : "Lier la Session"}</span>
                  </button>
                </div>
              </form>

              {/* Disconnect Action */}
              {isConnected && (
                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-rose-400">Zone de Danger</span>
                    <p className="text-[11px] text-slate-500">Déconnecter le bot effacera la session active sur nos serveurs.</p>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    disabled={connectLoading}
                    className="btn btn-xs sm:btn-sm bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl shrink-0 self-start sm:self-auto"
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>Déconnecter ce Bot</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* GLOBAL STUDIO MODAL (DAISYUI RESPONSIVE MODAL) */}
      {/* ------------------------------------------------------------- */}
      {showStudio && (
        <dialog className="modal modal-open modal-bottom sm:modal-middle bg-black/80 backdrop-blur-sm z-50 animate-fadeIn">
          <div className="modal-box bg-slate-900 border border-slate-800 p-4 sm:p-6 max-w-2xl w-full text-slate-100 shadow-2xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">Passerelle d'Appairage WhatsApp</h3>
                  <p className="text-[10px] sm:text-xs text-slate-400">Canal direct sécurisé SSL</p>
                </div>
              </div>
              <button
                onClick={() => setShowStudio(false)}
                className="btn btn-sm btn-circle btn-ghost text-slate-400 hover:text-white"
                aria-label="Fermer la fenêtre d'appairage"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Methods switch */}
            <div className="grid grid-cols-2 gap-2 mt-3 p-1 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
              <button
                onClick={() => setStudioMethod("qr")}
                className={`btn btn-xs sm:btn-sm rounded-lg border-none text-xs font-bold transition-all ${
                  studioMethod === "qr" ? "bg-emerald-500 text-slate-950 font-black shadow-md" : "btn-ghost text-slate-400"
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Appairage QR Code</span>
              </button>
              <button
                onClick={() => setStudioMethod("pair")}
                className={`btn btn-xs sm:btn-sm rounded-lg border-none text-xs font-bold transition-all ${
                  studioMethod === "pair" ? "bg-emerald-500 text-slate-950 font-black shadow-md" : "btn-ghost text-slate-400"
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Code Téléphone</span>
              </button>
            </div>

            {/* Iframe container */}
            <div className="mt-3 flex-1 min-h-[300px] sm:min-h-[380px] w-full bg-white rounded-2xl overflow-hidden shadow-inner">
              <iframe
                src={studioMethod === "qr" ? "https://session.rgnk.site/qr-code" : "https://session.rgnk.site/pairing-code"}
                className="w-full h-full border-0"
                title="MyZapp Authenticator SSL Gateway"
              />
            </div>

            {/* Paste Session Input */}
            <form onSubmit={handleConnectSession} className="mt-3 pt-3 border-t border-slate-800 flex flex-col sm:flex-row gap-2 shrink-0">
              <input
                type="text"
                required
                value={sessionInput}
                onChange={(e) => setSessionInput(e.target.value)}
                placeholder="Coller votre code RGNK~..."
                className="input input-bordered input-sm sm:input-md flex-1 bg-slate-950 border-slate-700 text-white rounded-xl focus:border-emerald-500 font-mono text-xs"
              />
              <button
                type="submit"
                disabled={connectLoading || !sessionInput.trim()}
                className="btn btn-sm sm:btn-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl px-4 shrink-0"
              >
                <Zap className="w-4 h-4" />
                <span>{connectLoading ? "Liaison..." : "Lier la Session"}</span>
              </button>
            </form>
          </div>
          <div className="modal-backdrop bg-black/60" onClick={() => setShowStudio(false)} />
        </dialog>
      )}
    </div>
  );
}
