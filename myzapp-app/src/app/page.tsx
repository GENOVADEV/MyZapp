"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Bot, 
  Zap, 
  ShieldCheck, 
  Sparkles, 
  Send, 
  Download, 
  Users, 
  MessageSquare, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight, 
  ChevronRight, 
  Play, 
  Radio, 
  Cpu, 
  Layers, 
  Lock, 
  Clock, 
  Smartphone,
  Globe,
  Share2,
  FileText,
  Video,
  Star
} from "lucide-react";

export default function LandingPage() {
  const [activeDemoTab, setActiveDemoTab] = useState<"ai" | "diffuse" | "media" | "group">("ai");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  return (
    <main className="relative overflow-hidden pt-28 pb-20">
      {/* Background Ambient Glows & Cyber Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-[#00D06C]/15 to-transparent blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 -right-40 w-[600px] h-[500px] bg-[#3B82F6]/10 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute top-2/3 -left-40 w-[600px] h-[500px] bg-[#00FFA2]/10 blur-[150px] pointer-events-none rounded-full" />

      {/* 1. HERO SECTION */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 text-center">
        {/* Top Floating Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-[#00FFA2] mb-8 shadow-lg shadow-emerald-500/10 animate-fade-in hover:scale-105 transition-transform cursor-default">
          <Sparkles size={14} className="animate-spin text-[#00FFA2]" />
          <span>NOUVEAU : Moteur Raganork v6.2 avec IA Gemini Pro Intégrée</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#00FFA2]" />
        </div>

        {/* Main Headings */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight max-w-5xl mx-auto leading-[1.1] mb-6">
          BOOSTEZ <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D06C] via-[#00FFA2] to-[#38BDF8] text-glow">WHATSAPP</span>,
          <br /> DÉPASSEZ LES LIMITES.
        </h1>

        <p className="text-base sm:text-xl text-slate-300 max-w-3xl mx-auto mb-10 font-normal leading-relaxed">
          Le Bot WhatsApp le plus complet pour l'Afrique et le monde : <strong className="text-white">Chatbot IA conversationnel</strong>, 
          <strong className="text-white"> diffusion marketing anti-ban</strong> avec pauses intelligentes, 
          téléchargeur de vidéos 4K et gestion automatisée de vos groupes.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-16">
          <Link
            href="/auth?tab=register"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl btn-myzapp text-sm font-black flex items-center justify-center gap-2.5 shadow-2xl shadow-emerald-500/30 group"
          >
            <span>Démarrer Gratuitement</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="#fonctionnalites"
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Play size={16} className="text-[#00D06C]" />
            <span>Découvrir les Fonctionnalités</span>
          </Link>
        </div>

        {/* Live Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="text-2xl sm:text-3xl font-black text-[#00FFA2] mb-1">99.98%</div>
            <div className="text-xs font-semibold text-slate-300">Sécurité Anti-Ban</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Pauses 15-20 min progressives</div>
          </div>
          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="text-2xl sm:text-3xl font-black text-white mb-1">0.18s</div>
            <div className="text-xs font-semibold text-slate-300">Réponse Ultra-Rapide</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Sur infrastructure haute dispo</div>
          </div>
          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 mb-1">50+</div>
            <div className="text-xs font-semibold text-slate-300">Commandes & Outils</div>
            <div className="text-[11px] text-slate-500 mt-0.5">AI, Media, Groupes, CRM</div>
          </div>
          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="text-2xl sm:text-3xl font-black text-sky-400 mb-1">24/7</div>
            <div className="text-xs font-semibold text-slate-300">Disponibilité Totale</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Votre bot veille sans arrêt</div>
          </div>
        </div>
      </section>

      {/* 2. INTERACTIVE LIVE BOT SIMULATOR */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-8">
          <span className="text-xs font-black tracking-widest text-[#00D06C] uppercase">Démonstration en Direct</span>
          <h2 className="text-2xl sm:text-4xl font-black text-white mt-1">Voyez MyZapp en Action</h2>
        </div>

        {/* Interactive Tabs */}
        <div className="flex justify-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-white/10 max-w-lg mx-auto mb-6">
          <button
            onClick={() => setActiveDemoTab("ai")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeDemoTab === "ai"
                ? "bg-[#00D06C] text-[#060D1F] shadow-lg"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🤖 IA Gemini
          </button>
          <button
            onClick={() => setActiveDemoTab("diffuse")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeDemoTab === "diffuse"
                ? "bg-[#00D06C] text-[#060D1F] shadow-lg"
                : "text-slate-400 hover:text-white"
            }`}
          >
            📢 Diffusion Anti-Ban
          </button>
          <button
            onClick={() => setActiveDemoTab("media")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeDemoTab === "media"
                ? "bg-[#00D06C] text-[#060D1F] shadow-lg"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🎬 Téléchargeur 4K
          </button>
          <button
            onClick={() => setActiveDemoTab("group")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeDemoTab === "group"
                ? "bg-[#00D06C] text-[#060D1F] shadow-lg"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🛡️ Anti-Lien & Sécurité
          </button>
        </div>

        {/* WhatsApp Mock Chat Window */}
        <div className="rounded-3xl bg-[#0F172A] border border-white/10 overflow-hidden shadow-2xl">
          {/* Chat Header */}
          <div className="bg-[#0A1128] px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-400 p-0.5">
                <div className="w-full h-full bg-[#060D1F] rounded-full flex items-center justify-center p-1">
                  <img src="/logo.svg" alt="MyZapp Bot" className="w-full h-full object-contain" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#00FFA2] border-2 border-[#0A1128]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  MyZapp AI Assistant
                  <span className="badge badge-xs bg-emerald-500/20 text-[#00FFA2] border-none text-[10px]">BOT</span>
                </h4>
                <p className="text-[11px] text-emerald-400 font-medium">En ligne • Réponse instantanée</p>
              </div>
            </div>
            <div className="text-xs text-slate-400 hidden sm:block">Chiffrement de bout en bout</div>
          </div>

          {/* Chat Body */}
          <div className="p-6 space-y-4 bg-[#070E24]/60 min-h-[300px] flex flex-col justify-end">
            {activeDemoTab === "ai" && (
              <>
                <div className="flex justify-end">
                  <div className="bg-emerald-600/90 text-white rounded-2xl rounded-tr-none px-4 py-2.5 max-w-sm text-xs font-medium shadow-md">
                    .ai Peux-tu rédiger un message de promotion pour mes nouveaux articles de mode avec un ton irrésistible ?
                  </div>
                </div>
                <div className="flex justify-start items-end gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center p-1 shrink-0">
                    <img src="/logo.svg" alt="Bot" />
                  </div>
                  <div className="bg-slate-800/90 border border-white/10 text-slate-100 rounded-2xl rounded-tl-none px-4 py-3 max-w-md text-xs leading-relaxed shadow-md">
                    <p className="font-bold text-[#00FFA2] mb-1">✨ MyZapp IA Gemini :</p>
                    <p>🔥 <strong>NOUVELLE COLLECTION EN LIGNE !</strong> 🔥<br />
                    Sublimez votre style avec nos pièces exclusives reçues cette semaine ! ✨<br />
                    👉 Cliquez ici pour commander avant rupture de stock : [Votre Lien]<br />
                    🎁 <em>-10% pour les 15 premières commandes aujourd'hui !</em></p>
                    <span className="text-[10px] text-slate-400 block mt-2 text-right">0.12s • Traité par IA</span>
                  </div>
                </div>
              </>
            )}

            {activeDemoTab === "diffuse" && (
              <>
                <div className="flex justify-end">
                  <div className="bg-emerald-600/90 text-white rounded-2xl rounded-tr-none px-4 py-2.5 max-w-sm text-xs font-medium shadow-md">
                    .diffuse business Mon message d'annonce promo
                  </div>
                </div>
                <div className="flex justify-start items-end gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center p-1 shrink-0">
                    <img src="/logo.svg" alt="Bot" />
                  </div>
                  <div className="bg-slate-800/90 border border-white/10 text-slate-100 rounded-2xl rounded-tl-none px-4 py-3 max-w-md text-xs leading-relaxed shadow-md">
                    <p className="font-bold text-amber-400 mb-1">🛡️ Diffusion Ultra-Sécurisée Business Activée :</p>
                    <p>• <strong>Destinataires :</strong> 250 contacts ciblés<br />
                    • <strong>Rythme :</strong> Envoi progressif (5-15s) puis <strong>pause de 15 min tous les 15 messages</strong>.<br />
                    • <strong>Protection Anti-Ban :</strong> MAXIMALE (Votre numéro est 100% protégé).</p>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2">
                      <div className="bg-[#00D06C] h-1.5 rounded-full w-2/5 animate-pulse" />
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeDemoTab === "media" && (
              <>
                <div className="flex justify-end">
                  <div className="bg-emerald-600/90 text-white rounded-2xl rounded-tr-none px-4 py-2.5 max-w-sm text-xs font-medium shadow-md">
                    https://vm.tiktok.com/ZMxxxxxx/
                  </div>
                </div>
                <div className="flex justify-start items-end gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center p-1 shrink-0">
                    <img src="/logo.svg" alt="Bot" />
                  </div>
                  <div className="bg-slate-800/90 border border-white/10 text-slate-100 rounded-2xl rounded-tl-none px-4 py-3 max-w-md text-xs leading-relaxed shadow-md">
                    <p className="font-bold text-[#00FFA2] mb-1">🎬 Vidéo TikTok Téléchargée Sans Filigrane :</p>
                    <p>Qualité : <strong>HD 1080p</strong> • Audio : <strong>Stéréo Original</strong><br />
                    <em>Fichier vidéo MP4 envoyé directement dans la discussion !</em></p>
                  </div>
                </div>
              </>
            )}

            {activeDemoTab === "group" && (
              <>
                <div className="flex justify-end">
                  <div className="bg-rose-500/30 border border-rose-500/40 text-rose-200 rounded-2xl rounded-tr-none px-4 py-2.5 max-w-sm text-xs font-medium">
                    (Membre suspect envoie un lien frauduleux : https://fake-crypto.com)
                  </div>
                </div>
                <div className="flex justify-start items-end gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center p-1 shrink-0">
                    <img src="/logo.svg" alt="Bot" />
                  </div>
                  <div className="bg-slate-800/90 border border-white/10 text-slate-100 rounded-2xl rounded-tl-none px-4 py-3 max-w-md text-xs leading-relaxed shadow-md">
                    <p className="font-bold text-rose-400 mb-1">🚫 Anti-Lien Déclenché :</p>
                    <p>• Message supprimé instantanément.<br />
                    • Utilisateur <strong>@22507000000</strong> averti (Avertissement 1/3).<br />
                    • Votre groupe reste protégé contre le spam et les arnaques.</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 3. CORE FEATURES SECTION */}
      <section id="fonctionnalites" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-black tracking-widest text-[#00D06C] uppercase">Arsenal Complet</span>
          <h2 className="text-3xl sm:text-5xl font-black text-white mt-2 mb-4">
            Tout ce dont votre compte WhatsApp a besoin
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            Une suite complète d'outils automatisés conçue pour démultiplier vos ventes, animer vos communautés et sécuriser vos groupes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="glass-card rounded-3xl p-8 border border-white/10 hover:border-emerald-500/40 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[#00FFA2] mb-6 group-hover:scale-110 transition-transform">
              <Bot size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2.5">Chatbot IA Gemini 24/7</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
              Connecté au modèle Google Gemini, votre bot répond avec intelligence et naturel à tous vos clients. Personnalisez son rôle et ses instructions.
            </p>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[#00FFA2]" />
                <span>Mémoire des conversations précédentes</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[#00FFA2]" />
                <span>Mode public, privé ou administrateur</span>
              </li>
            </ul>
          </div>

          {/* Card 2 */}
          <div className="glass-card rounded-3xl p-8 border border-white/10 hover:border-emerald-500/40 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-6 group-hover:scale-110 transition-transform">
              <Send size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2.5">Diffusion Anti-Ban</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
              Diffusez vos annonces à des centaines de contacts sans vous faire bloquer grâce au mode Business avec pauses de 15 à 20 minutes.
            </p>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-sky-400" />
                <span>Modes Normal, Rapide et Business</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-sky-400" />
                <span>Régulation des délais aléatoires (5-15s)</span>
              </li>
            </ul>
          </div>

          {/* Card 3 */}
          <div className="glass-card rounded-3xl p-8 border border-white/10 hover:border-emerald-500/40 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
              <Video size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2.5">Téléchargeur Média 4K</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
              Envoyez simplement un lien pour recevoir la vidéo ou l'audio immédiatement dans votre discussion.
            </p>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-purple-400" />
                <span>TikTok (sans watermark), Insta Reels</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-purple-400" />
                <span>YouTube Vidéo HD & MP3 320kbps</span>
              </li>
            </ul>
          </div>

          {/* Card 4 */}
          <div className="glass-card rounded-3xl p-8 border border-white/10 hover:border-emerald-500/40 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2.5">Protection de Groupes</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
              Surveillance automatique des liens frauduleux, anti-spam, suppression des messages interdits et expulsions configurables.
            </p>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-amber-400" />
                <span>Anti-Lien avec liste blanche de domaines</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-amber-400" />
                <span>Système de Warn (avertissements)</span>
              </li>
            </ul>
          </div>

          {/* Card 5 */}
          <div className="glass-card rounded-3xl p-8 border border-white/10 hover:border-emerald-500/40 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[#00FFA2] mb-6 group-hover:scale-110 transition-transform">
              <Zap size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2.5">Réponses & Filtres Auto</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
              Configurez des mots-clés qui renvoient automatiquement vos prix, catalogues PDF, coordonnées bancaires ou messages d'accueil.
            </p>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[#00FFA2]" />
                <span>Support texte, image, audio et documents</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[#00FFA2]" />
                <span>Filtres par groupe ou globaux</span>
              </li>
            </ul>
          </div>

          {/* Card 6 */}
          <div className="glass-card rounded-3xl p-8 border border-white/10 hover:border-emerald-500/40 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-6 group-hover:scale-110 transition-transform">
              <Users size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2.5">CRM & Export Contacts</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
              Exportez en un clic tous les contacts d'un groupe WhatsApp dans votre carnet d'adresses (VCF) pour vos futures campagnes.
            </p>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-rose-400" />
                <span>Exportation VCF / Contacts en 1 seconde</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-rose-400" />
                <span>Tagall invisible ou avec mention</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 4. USE CASES SECTION */}
      <section id="cas-dusage" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-slate-950/40 rounded-3xl border border-white/5 my-12">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-black tracking-widest text-[#00FFA2] uppercase">Pour qui est fait MyZapp ?</span>
          <h2 className="text-3xl sm:text-5xl font-black text-white mt-2 mb-4">
            Des résultats concrets pour chaque profil
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-[#0A1128] border border-white/10 space-y-3">
            <span className="text-3xl">🛍️</span>
            <h4 className="text-base font-bold text-white">E-Commerce & Vente</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Répondez aux clients à toute heure, envoyez vos catalogues et relancez les paniers abandonnés automatiquement.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0A1128] border border-white/10 space-y-3">
            <span className="text-3xl">📢</span>
            <h4 className="text-base font-bold text-white">Créateurs & Influenceurs</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Diffusez vos nouveautés, vidéos et offres promotionnelles à votre audience sans risquer le blocage WhatsApp.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0A1128] border border-white/10 space-y-3">
            <span className="text-3xl">🏢</span>
            <h4 className="text-base font-bold text-white">Entreprises & Support</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Un service client disponible 24/7 qui traite les questions courantes et qualifie les prospects avant l'intervention humaine.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0A1128] border border-white/10 space-y-3">
            <span className="text-3xl">👥</span>
            <h4 className="text-base font-bold text-white">Communautés & Groupes</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Accueillez les nouveaux membres, bloquez les spams et mentionnez tout le monde pour les annonces urgentes.
            </p>
          </div>
        </div>
      </section>

      {/* 5. PRICING SECTION */}
      <section id="tarifs" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-black tracking-widest text-[#00D06C] uppercase">Tarification Transparente</span>
          <h2 className="text-3xl sm:text-5xl font-black text-white mt-2 mb-4">
            Choisissez l'offre adaptée à votre croissance
          </h2>
          <p className="text-sm text-slate-400">
            Démarrez gratuitement et passez au niveau supérieur quand vous le souhaitez.
          </p>

          {/* Billing Switch */}
          <div className="inline-flex items-center gap-3 p-1.5 rounded-full bg-slate-900 border border-white/10 mt-6">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                billingCycle === "monthly"
                  ? "bg-[#00D06C] text-[#060D1F]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                billingCycle === "yearly"
                  ? "bg-[#00D06C] text-[#060D1F]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Annuel</span>
              <span className="badge badge-xs bg-[#00FFA2] text-[#060D1F] border-none text-[9px] font-extrabold">-20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
          {/* Plan 1: Starter */}
          <div className="glass-card rounded-3xl p-8 border border-white/10 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Starter</div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-black text-white">0 FCFA</span>
                <span className="text-xs text-slate-500">/ toujours</span>
              </div>
              <p className="text-xs text-slate-400 mb-6">Parfait pour tester la puissance du bot et s'initier à l'automatisation.</p>
              
              <ul className="space-y-3 text-xs text-slate-300 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#00D06C]" />
                  <span>1 Session WhatsApp connectée</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#00D06C]" />
                  <span>Chatbot IA (50 requêtes/jour)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#00D06C]" />
                  <span>Téléchargements médias illimités</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#00D06C]" />
                  <span>Protection Anti-Lien basique</span>
                </li>
              </ul>
            </div>

            <Link
              href="/auth?tab=register"
              className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-white font-bold text-xs text-center transition-colors"
            >
              Commencer Gratuitement
            </Link>
          </div>

          {/* Plan 2: Pro Booster (Popular) */}
          <div className="glass-card rounded-3xl p-8 border-2 border-[#00D06C] relative flex flex-col justify-between shadow-2xl shadow-emerald-500/20">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#00D06C] text-[#060D1F] px-4 py-1 rounded-full text-[10px] font-black tracking-wider uppercase flex items-center gap-1">
              <Star size={12} fill="#060D1F" />
              <span>LE PLUS POPULAIRE</span>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#00FFA2] mb-2">Pro Booster</div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-black text-white">
                  {billingCycle === "monthly" ? "4 900 FCFA" : "3 900 FCFA"}
                </span>
                <span className="text-xs text-slate-500">/ mois</span>
              </div>
              <p className="text-xs text-slate-400 mb-6">Pour les vendeurs, créateurs et entreprises qui veulent booster leurs ventes.</p>
              
              <ul className="space-y-3 text-xs text-slate-200 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#00FFA2]" />
                  <span><strong>Chatbot Gemini Illimité</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#00FFA2]" />
                  <span><strong>Diffusion Anti-Ban Business</strong> (Pauses 15 min)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#00FFA2]" />
                  <span>Export de contacts VCF illimité</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#00FFA2]" />
                  <span>Jusqu'à 25 groupes modérés simultanément</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#00FFA2]" />
                  <span>Support prioritaire WhatsApp 7j/7</span>
                </li>
              </ul>
            </div>

            <Link
              href="/auth?tab=register"
              className="w-full py-3.5 rounded-xl btn-myzapp font-black text-xs text-center shadow-lg"
            >
              Activer le Pack Pro
            </Link>
          </div>

          {/* Plan 3: Business VIP */}
          <div className="glass-card rounded-3xl p-8 border border-white/10 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-2">Entreprise VIP</div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-black text-white">
                  {billingCycle === "monthly" ? "14 900 FCFA" : "11 900 FCFA"}
                </span>
                <span className="text-xs text-slate-500">/ mois</span>
              </div>
              <p className="text-xs text-slate-400 mb-6">Pour les grandes agences, multi-comptes et intégrations personnalisées.</p>
              
              <ul className="space-y-3 text-xs text-slate-300 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-sky-400" />
                  <span>Multi-Sessions (Jusqu'à 5 numéros)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-sky-400" />
                  <span>Accès API Node.js & Webhooks Dédiés</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-sky-400" />
                  <span>Serveur dédié haute vitesse</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-sky-400" />
                  <span>Accompagnement & Setup personnalisé</span>
                </li>
              </ul>
            </div>

            <Link
              href="/contact"
              className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-white font-bold text-xs text-center transition-colors"
            >
              Contacter l'Équipe VIP
            </Link>
          </div>
        </div>
      </section>

      {/* 6. UPDATES / CHANGELOG SECTION */}
      <section id="mises-a-jour" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="glass-card rounded-3xl p-8 border border-white/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-6">
            <div>
              <span className="text-xs font-bold text-[#00FFA2] uppercase tracking-wider">Changelog & Nouveautés</span>
              <h3 className="text-2xl font-bold text-white mt-1">Dernières Mises à Jour (v6.2.30)</h3>
            </div>
            <span className="badge badge-md bg-emerald-500/20 text-[#00FFA2] border-emerald-500/30 font-mono text-xs">
              Version Stable
            </span>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-300">
            <div className="flex items-start gap-3">
              <span className="badge badge-xs bg-emerald-500 mt-1 shrink-0" />
              <div>
                <strong className="text-white">Diffusion Ultra-Sécurisée avec Pauses Automatiques :</strong> Ajout du mode Business qui met en pause les diffusions pendant 15 à 20 minutes tous les 15 envois pour contrer les algorithmes anti-spam.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="badge badge-xs bg-sky-500 mt-1 shrink-0" />
              <div>
                <strong className="text-white">Connexion WhatsApp par Iframe/SDK :</strong> Génération de QR Code et Pairing Code via `https://session.rgnk.site` avec copie automatique de session.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="badge badge-xs bg-purple-500 mt-1 shrink-0" />
              <div>
                <strong className="text-white">Support Google Gemini Pro IA :</strong> Réponses contextuelles enrichies avec gestion de la mémoire de conversation.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FINAL CTA BANNER */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
        <div className="rounded-3xl bg-gradient-to-r from-[#00A352] to-[#0A1128] border border-emerald-500/30 p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">
            Prêt à révolutionner votre présence WhatsApp ?
          </h2>
          <p className="text-sm sm:text-base text-emerald-100 max-w-2xl mx-auto mb-8">
            Rejoignez des centaines d'utilisateurs qui automatisent leur business avec MyZapp. Configuration en moins de 2 minutes.
          </p>
          <Link
            href="/auth?tab=register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-[#060D1F] hover:bg-slate-100 font-black text-sm transition-all shadow-xl hover:scale-105"
          >
            <span>Créer mon Bot Gratuitement</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
