"use client";

import Link from "next/link";
import { 
  Bot, 
  Terminal, 
  Send, 
  ShieldCheck, 
  Download, 
  Users, 
  Sparkles, 
  Copy, 
  Check, 
  FileText,
  Search
} from "lucide-react";
import { useState } from "react";

export default function DocsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copyToClipboard = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const COMMAND_CATEGORIES = [
    {
      category: "🤖 Intelligence Artificielle (Gemini)",
      commands: [
        { name: ".ai <question>", desc: "Posez n'importe quelle question au bot avec réponse IA contextuelle immédiate." },
        { name: ".chatbot on/off", desc: "Active ou désactive la réponse IA automatique pour les discussions privées." },
        { name: ".gpt <prompt>", desc: "Génération de texte ou d'idées marketing pour vos ventes." },
      ]
    },
    {
      category: "📢 Diffusion & Marketing Anti-Ban",
      commands: [
        { name: ".diffuse <message>", desc: "Diffuse un message à tous vos contacts avec délai aléatoire sécurisé." },
        { name: ".diffuse business <message>", desc: "Mode Ultra-Sécurisé : envoie par paquets de 15 messages avec pause automatique de 15 min." },
        { name: ".tagall <texte>", desc: "Mentionne tous les membres d'un groupe pour une annonce importante." },
      ]
    },
    {
      category: "🎬 Téléchargement de Médias 4K (Autodl)",
      commands: [
        { name: ".yt <url ou titre>", desc: "Télécharge une vidéo ou audio YouTube en haute fidélité (MP3/MP4)." },
        { name: ".tiktok <url>", desc: "Télécharge une vidéo TikTok sans filigrane (Watermark)." },
        { name: ".insta <url>", desc: "Télécharge les Reels, carrousels et publications Instagram." },
        { name: ".fb <url>", desc: "Télécharge les vidéos publiques Facebook en qualité HD." },
      ]
    },
    {
      category: "🛡️ Sécurité & Modération de Groupe",
      commands: [
        { name: ".antilink on/off", desc: "Supprime automatiquement tout lien non autorisé envoyé dans le groupe." },
        { name: ".antispam on/off", desc: "Détecte et expulse les spambots ou expéditeurs frénétiques." },
        { name: ".warn @user <motif>", desc: "Donne un avertissement à un membre (3 avertissements = expulsion)." },
        { name: ".welcome on/off", desc: "Active le message d'accueil personnalisé pour les nouveaux arrivants." },
      ]
    },
    {
      category: "⚙️ Gestion & Utilitaires",
      commands: [
        { name: ".filter <mot_clé> = <réponse>", desc: "Crée une réponse automatique instantanée dès qu'un mot-clé est détecté." },
        { name: ".vcf", desc: "Exporte la liste complète des membres d'un groupe en carnet de contacts VCF." },
        { name: ".alive", desc: "Vérifie la latence (ping) et le statut de fonctionnement du bot." },
      ]
    }
  ];

  const filteredCategories = COMMAND_CATEGORIES.map(cat => ({
    ...cat,
    commands: cat.commands.filter(cmd => 
      cmd.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cmd.desc.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(cat => cat.commands.length > 0);

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <span className="text-xs font-black tracking-widest text-[#00D06C] uppercase">Centre de Documentation</span>
        <h1 className="text-3xl sm:text-5xl font-black text-white mt-2 mb-4">
          Guide & Liste des Commandes MyZapp
        </h1>
        <p className="text-sm text-slate-400">
          Retrouvez toutes les commandes disponibles sur votre bot WhatsApp avec leur syntaxe et leur fonctionnement.
        </p>

        {/* Search Input */}
        <div className="relative max-w-md mx-auto mt-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher une commande (ex: .ai, .diffuse, .yt)..."
            className="w-full bg-slate-900/90 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-xs text-white focus:outline-none focus:border-[#00D06C] transition-colors"
          />
        </div>
      </div>

      {/* Commands List */}
      <div className="space-y-8">
        {filteredCategories.map((cat, idx) => (
          <div key={idx} className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10">
            <h2 className="text-lg font-bold text-white mb-4 pb-3 border-b border-white/5">
              {cat.category}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cat.commands.map((cmd, cIdx) => (
                <div key={cIdx} className="bg-slate-900/70 p-4 rounded-2xl border border-white/5 space-y-2 hover:border-emerald-500/30 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#00FFA2] bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      {cmd.name}
                    </span>
                    <button
                      onClick={() => copyToClipboard(cmd.name.split(" ")[0])}
                      className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                      title="Copier la commande"
                    >
                      {copiedCmd === cmd.name.split(" ")[0] ? (
                        <Check size={14} className="text-emerald-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{cmd.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
