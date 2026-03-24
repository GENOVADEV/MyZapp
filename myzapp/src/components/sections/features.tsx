// src/components/features.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  Lock, 
  Pencil, 
  Clock, 
  Languages,
  Heart,
  Search,
  Mic,
  FastForward,
  Pin,
  Folder,
  FileUp,
  Image as ImageIcon,
  Wand2,
  Users,
  BarChart3,
  Video,
  Palette,
  Zap,
  Shield,
  MessageSquare,
  Camera,
  Settings,
  Smartphone
} from 'lucide-react';

// Types
interface Feature {
  id: number;
  title: string;
  description: string;
  category: 'privacy' | 'messages' | 'media' | 'groups' | 'calls' | 'custom';
  icon: React.ReactNode;
  preview: React.ReactNode;
}

// Composant de prévisualisation de chat
const ChatPreview = ({ children, title = "Aperçu" }: { children: React.ReactNode; title?: string }) => (
  <div className="w-full h-full bg-background-chat rounded-lg overflow-hidden shadow-lg border border-border-main">
    {/* Header du chat */}
    <div className="bg-panel border-b border-border-main px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
        <MessageSquare className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-sm text-text-main">{title}</h4>
        <p className="text-xs text-text-subtle">en ligne</p>
      </div>
    </div>
    {/* Contenu du chat */}
    <div className="p-4 space-y-3 h-64 overflow-y-auto scrollbar-whatsapp">
      {children}
    </div>
  </div>
);

// Composant de bulle de message
const MessageBubble = ({ 
  text, 
  sent = false, 
  time = "14:32",
  status,
  highlight = false
}: { 
  text: string; 
  sent?: boolean; 
  time?: string;
  status?: 'sent' | 'delivered' | 'read';
  highlight?: boolean;
}) => (
  <div className={`flex ${sent ? 'justify-end' : 'justify-start'} animate-message-appear`}>
    <div className={`
      ${sent ? 'message-bubble-out' : 'message-bubble-in'} 
      message-bubble
      ${highlight ? 'ring-2 ring-primary ring-offset-2 ring-offset-background-chat' : ''}
    `}>
      <p className="text-sm whitespace-pre-wrap">{text}</p>
      <div className="flex items-center justify-end gap-1 mt-1">
        <span className="text-xs text-text-subtle">{time}</span>
        {sent && status && (
          <svg className={`w-4 h-4 ${status === 'read' ? 'text-primary' : 'text-text-subtle'}`} viewBox="0 0 16 15" fill="none">
            <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.033l-.358-.325a.32.32 0 0 0-.484.032l-.378.43a.32.32 0 0 0 .032.484l1.164 1.055a.32.32 0 0 0 .484-.033l6.272-8.048a.365.365 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" fill="currentColor"/>
          </svg>
        )}
      </div>
    </div>
  </div>
);

// Liste des 20 fonctionnalités sélectionnées
const features: Feature[] = [
  {
    id: 1,
    title: "Mode Invisible Total",
    description: "Naviguez sur WhatsApp sans laisser aucune trace : ni statut en ligne, ni vu, ni indication d'écriture.",
    category: 'privacy',
    icon: <EyeOff className="w-6 h-6" />,
    preview: (
      <ChatPreview title="Mode Invisible">
        <MessageBubble text="Salut ! Tu es là ?" time="14:30" />
        <div className="flex justify-center my-2">
          <div className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-full">
            🕵️ Vous êtes invisible
          </div>
        </div>
        <MessageBubble text="Je réponds quand je veux sans pression !" sent time="14:45" status="sent" highlight />
        <div className="text-xs text-text-subtle text-center mt-2">
          ✓ Pas de "en ligne" • Pas de "vu" • Pas de "en train d'écrire"
        </div>
      </ChatPreview>
    )
  },
  {
    id: 2,
    title: "Modifier Sans Limite",
    description: "Modifiez vos messages à tout moment, même des jours après l'envoi, sans restriction de temps.",
    category: 'messages',
    icon: <Pencil className="w-6 h-6" />,
    preview: (
      <ChatPreview title="Édition Avancée">
        <MessageBubble text="On se retrouve demani ?" sent time="Hier 15:20" status="read" />
        <MessageBubble text="On se retrouve demain à 18h ?" sent time="Aujourd'hui 10:05" status="read" highlight />
        <div className="text-xs text-text-subtle italic text-right">
          ✏️ Modifié il y a 2 minutes
        </div>
      </ChatPreview>
    )
  },
  {
    id: 3,
    title: "Programmer l'Envoi",
    description: "Planifiez l'envoi de vos messages à l'heure exacte souhaitée. Parfait pour les anniversaires ou rappels.",
    category: 'messages',
    icon: <Clock className="w-6 h-6" />,
    preview: (
      <ChatPreview title="Messages Programmés">
        <div className="bg-panel p-3 rounded-lg border border-border-main">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Message programmé</span>
          </div>
          <p className="text-sm text-text-main mb-2">Joyeux anniversaire ! 🎉</p>
          <div className="text-xs text-text-subtle">
            📅 Envoi : Demain à 00:00
          </div>
        </div>
        <MessageBubble text="Parfait pour ne jamais oublier !" sent time="14:32" status="read" />
      </ChatPreview>
    )
  },
  {
    id: 4,
    title: "Traduction Automatique",
    description: "Traduisez instantanément les messages reçus dans votre langue. Idéal pour les conversations internationales.",
    category: 'messages',
    icon: <Languages className="w-6 h-6" />,
    preview: (
      <ChatPreview title="Traduction Auto">
        <MessageBubble text="Hello! How are you today?" time="14:28" />
        <div className="bg-primary/5 p-2 rounded border-l-4 border-primary ml-4">
          <div className="flex items-center gap-1 mb-1">
            <Languages className="w-3 h-3 text-primary" />
            <span className="text-xs text-primary">Traduit de l'anglais</span>
          </div>
          <p className="text-sm text-text-main">Bonjour ! Comment vas-tu aujourd'hui ?</p>
        </div>
        <MessageBubble text="Je vais très bien merci ! 😊" sent time="14:30" status="read" highlight />
      </ChatPreview>
    )
  },
  {
    id: 5,
    title: "Réactions Personnalisées",
    description: "Réagissez avec n'importe quel emoji, pas seulement les 6 proposés par défaut.",
    category: 'messages',
    icon: <Heart className="w-6 h-6" />,
    preview: (
      <ChatPreview title="Réactions Custom">
        <MessageBubble text="J'ai réussi mon exam ! 📚" time="14:25" />
        <div className="flex gap-2 ml-4 mb-2">
          <div className="bg-panel px-2 py-1 rounded-full text-xs shadow-sm border border-border-main animate-bounce-in">🎉</div>
          <div className="bg-panel px-2 py-1 rounded-full text-xs shadow-sm border border-border-main animate-bounce-in" style={{ animationDelay: '100ms' }}>🚀</div>
          <div className="bg-panel px-2 py-1 rounded-full text-xs shadow-sm border border-border-main animate-bounce-in" style={{ animationDelay: '200ms' }}>💯</div>
          <div className="bg-panel px-2 py-1 rounded-full text-xs shadow-sm border border-border-main animate-bounce-in" style={{ animationDelay: '300ms' }}>🏆</div>
        </div>
        <MessageBubble text="Bravo champion ! 🎊" sent time="14:26" status="read" highlight />
      </ChatPreview>
    )
  },
  {
    id: 6,
    title: "Transcription Audio",
    description: "Convertissez automatiquement les messages vocaux en texte. Plus besoin d'écouter dans les lieux bruyants.",
    category: 'messages',
    icon: <Mic className="w-6 h-6" />,
    preview: (
      <ChatPreview title="Transcription">
        <div className="flex gap-2 items-center bg-bubble-in p-3 rounded-lg max-w-[80%]">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="h-6 bg-primary/20 rounded-full w-full relative overflow-hidden">
              <div className="h-full bg-primary w-1/3 animate-pulse-typing"></div>
            </div>
            <span className="text-xs text-text-subtle">0:45</span>
          </div>
        </div>
        <div className="bg-panel p-3 rounded border-l-4 border-primary ml-4 animate-slide-up">
          <div className="flex items-center gap-1 mb-1">
            <MessageSquare className="w-3 h-3 text-primary" />
            <span className="text-xs text-primary">Transcription</span>
          </div>
          <p className="text-sm text-text-main italic">
            "Salut ! Je voulais te dire que la réunion est reportée à demain 15h. À plus !"
          </p>
        </div>
      </ChatPreview>
    )
  },
  {
    id: 7,
    title: "Dossiers de Chats",
    description: "Organisez vos conversations par dossiers : Travail, Famille, Amis, etc. pour une meilleure organisation.",
    category: 'messages',
    icon: <Folder className="w-6 h-6" />,
    preview: (
      <ChatPreview title="Organisation">
        <div className="space-y-2">
          <div className="bg-panel p-3 rounded-lg border-l-4 border-primary hover-lift cursor-pointer">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">💼 Travail</span>
              <span className="ml-auto bg-primary text-white text-xs px-2 py-0.5 rounded-full">12</span>
            </div>
          </div>
          <div className="bg-panel p-3 rounded-lg border-l-4 border-accent hover-lift cursor-pointer">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-accent" />
              <span className="font-semibold text-sm">👨‍👩‍👧 Famille</span>
              <span className="ml-auto bg-accent text-white text-xs px-2 py-0.5 rounded-full">5</span>
            </div>
          </div>
          <div className="bg-panel p-3 rounded-lg border-l-4 border-text-subtle hover-lift cursor-pointer">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-text-subtle" />
              <span className="font-semibold text-sm">🎮 Gaming</span>
              <span className="ml-auto bg-text-subtle text-white text-xs px-2 py-0.5 rounded-full">8</span>
            </div>
          </div>
        </div>
      </ChatPreview>
    )
  },
  {
    id: 8,
    title: "Fichiers Lourds",
    description: "Envoyez des fichiers jusqu'à 5 Go sans compression. Parfait pour les vidéos et présentations professionnelles.",
    category: 'media',
    icon: <FileUp className="w-6 h-6" />,
    preview: (
      <ChatPreview title="Transfert Fichier">
        <div className="bg-bubble-out p-3 rounded-lg ml-auto max-w-[85%]">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-primary/20 rounded flex items-center justify-center flex-shrink-0">
              <Video className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">Presentation_Final_v3.mp4</p>
              <p className="text-xs text-text-subtle">3.8 GB</p>
              <div className="mt-2 bg-primary/20 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-primary w-3/4 transition-all animate-pulse-typing"></div>
              </div>
              <p className="text-xs text-text-subtle mt-1">Envoi : 75% • 2 min restantes</p>
            </div>
          </div>
        </div>
      </ChatPreview>
    )
  },
  {
    id: 9,
    title: "Qualité Maximale",
    description: "Envoyez photos et vidéos en qualité originale par défaut, sans compression automatique.",
    category: 'media',
    icon: <ImageIcon className="w-6 h-6" />,
    preview: (
      <ChatPreview title="HD Quality">
        <div className="bg-bubble-out rounded-lg overflow-hidden ml-auto max-w-[90%]">
          <div className="relative">
            <div className="w-full h-48 bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
              <Camera className="w-12 h-12 text-primary/50" />
            </div>
            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>4K • 18 MB</span>
            </div>
          </div>
          <div className="p-2">
            <p className="text-xs text-text-subtle">✓ Qualité originale préservée</p>
          </div>
        </div>
      </ChatPreview>
    )
  },
  {
    id: 10,
    title: "Éditeur Avancé",
    description: "Retouchez vos photos et vidéos avec des outils professionnels : filtres, ajustements, stickers personnalisés.",
    category: 'media',
    icon: <Wand2 className="w-6 h-6" />,
    preview: (
      <ChatPreview title="Éditeur Pro">
        <div className="bg-panel p-3 rounded-lg border border-border-main">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">🎨 Édition</span>
            <div className="flex gap-2">
              <button className="p-1.5 bg-primary/10 rounded hover:bg-primary/20 transition-colors">
                <Palette className="w-4 h-4 text-primary" />
              </button>
              <button className="p-1.5 bg-primary/10 rounded hover:bg-primary/20 transition-colors">
                <Wand2 className="w-4 h-4 text-primary" />
              </button>
            </div>
          </div>
          <div className="w-full h-32 bg-gradient-to-br from-accent/20 to-primary/20 rounded flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-primary/50" />
          </div>
          <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-whatsapp pb-1">
            {['Original', 'Vintage', 'B&W', 'Vibrant', 'Warm'].map((filter, i) => (
              <div key={filter} className="flex-shrink-0 text-center">
                <div className={`w-12 h-12 rounded-lg ${i === 0 ? 'bg-primary' : 'bg-text-subtle/20'} mb-1`}></div>
                <span className="text-xs">{filter}</span>
              </div>
            ))}
          </div>
        </div>
      </ChatPreview>
    )
  },
  {
    id: 11,
    title: "Sondages Avancés",
    description: "Créez des sondages avec choix multiples, votes anonymes, et résultats détaillés en temps réel.",
    category: 'groups',
    icon: <BarChart3 className="w-6 h-6" />,
    preview: (
      <ChatPreview title="Groupe - 156 membres">
        <div className="bg-panel p-4 rounded-lg border border-border-main">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm">Sondage : Prochain événement ?</span>
          </div>
          <div className="space-y-2">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded" style={{ width: '65%' }}></div>
              <div className="relative p-2 flex items-center justify-between">
                <span className="text-sm">🍕 Pizza Party</span>
                <span className="text-sm font-semibold text-primary">65%</span>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-accent/20 rounded" style={{ width: '25%' }}></div>
              <div className="relative p-2 flex items-center justify-between">
                <span className="text-sm">🎳 Bowling</span>
                <span className="text-sm font-semibold">25%</span>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-text-subtle/10 rounded" style={{ width: '10%' }}></div>
              <div className="relative p-2 flex items-center justify-between">
                <span className="text-sm">🎬 Cinéma</span>
                <span className="text-sm font-semibold">10%</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-text-subtle mt-3">
            🔒 Vote anonyme • 42 votes • Se termine dans 2j
          </div>
        </div>
      </ChatPreview>
    )
  },
  {
    id: 12,
    title: "Statistiques Groupe",
    description: "Visualisez l'activité du groupe : membres actifs, messages par jour, heures de pointe.",
    category: 'groups',
    icon: <BarChart3 className="w-6 h-6" />,
    preview: (
      <ChatPreview title="Stats Groupe">
        <div className="bg-panel p-4 rounded-lg border border-border-main space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">📊 Activité 7 derniers jours</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-primary/10 p-2 rounded text-center">
              <div className="text-lg font-bold text-primary">842</div>
              <div className="text-xs text-text-subtle">Messages</div>
            </div>
            <div className="bg-accent/10 p-2 rounded text-center">
              <div className="text-lg font-bold text-accent">48</div>
              <div className="text-xs text-text-subtle">Actifs</div>
            </div>
            <div className="bg-text-subtle/10 p-2 rounded text-center">
              <div className="text-lg font-bold text-text-main">18h</div>
              <div className="text-xs text-text-subtle">Pic</div>
            </div>
          </div>
          <div className="flex items-end gap-1 h-20">
            {[30, 45, 60, 80, 95, 70, 85].map((height, i) => (
              <div 
                key={i} 
                className="flex-1 bg-primary/30 rounded-t hover:bg-primary transition-colors cursor-pointer"
                style={{ height: `${height}%` }}
              ></div>
            ))}
          </div>
        </div>
      </ChatPreview>
    )
  },
  {
    id: 13,
    title: "Modération Auto",
    description: "Filtrez automatiquement le spam, les liens suspects et les messages inappropriés dans vos groupes.",
    category: 'groups',
    icon: <Shield className="w-6 h-6" />,
    preview: (
      <ChatPreview title="Groupe Protégé">
        <MessageBubble text="Super discussion !" time="14:20" />
        <div className="bg-error/10 border border-error/30 p-3 rounded-lg">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-error mb-1">Message bloqué</p>
              <p className="text-xs text-text-subtle">Contenu suspect détecté et supprimé automatiquement</p>
            </div>
          </div>
        </div>
        <MessageBubble text="Merci pour la protection ! 🛡️" time="14:22" />
        <div className="text-xs text-text-subtle text-center mt-2 bg-primary/5 py-2 rounded">
          ✓ 3 messages filtrés aujourd'hui
        </div>
      </ChatPreview>
    )
  },
  {
    id: 14,
    title: "Appels Élargis",
    description: "Passez des appels vidéo avec jusqu'à 50 participants simultanés. Idéal pour les réunions d'équipe.",
    category: 'calls',
    icon: <Video className="w-6 h-6" />,
    preview: (
      <ChatPreview title="Appel Vidéo">
        <div className="bg-panel p-4 rounded-lg border border-border-main">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Réunion d'équipe</p>
              <p className="text-xs text-text-subtle flex items-center gap-1">
                <div className="w-2 h-2 bg-online rounded-full animate-pulse-typing"></div>
                En cours • 32 participants
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square bg-gradient-to-br from-primary/20 to-accent/20 rounded"></div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button className="flex-1 bg-primary text-white py-2 rounded-full text-xs font-semibold">
              Rejoindre
            </button>
            <button className="px-3 bg-panel border border-border-main rounded-full">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </ChatPreview>
    )
  },
  {
    id: 15,
    title: "Enregistrement Appels",
    description: "Enregistrez vos appels audio et vidéo importants pour ne rien manquer. Stockage sécurisé.",
    category: 'calls',
    icon: <Video className="w-6 h-6" />,
    preview: (
      <ChatPreview title="Appel Enregistré">
        <div className="bg-bubble-in p-3 rounded-lg max-w-[85%]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-error/20 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-error rounded-full animate-pulse-typing"></div>
            </div>
            <span className="text-sm font-semibold">Enregistrement en cours...</span>
          </div>
          <div className="text-xs text-text-subtle">
            ⏱️ 05:42 • Stockage chiffré
          </div>
        </div>
        <div className="text-xs text-text-subtle text-center mt-2">
          🔒 Les participants sont informés de l'enregistrement
        </div>
      </ChatPreview>
    )
  },
  {
    id: 16,
    title: "Thèmes Personnalisés",
    description: "Créez vos propres thèmes avec couleurs, icônes et typographies personnalisées.",
    category: 'custom',
    icon: <Palette className="w-6 h-6" />,
    preview: (
      <ChatPreview title="Personnalisation">
        <div className="bg-panel p-4 rounded-lg border border-border-main space-y-3">
          <p className="text-sm font-semibold mb-2">🎨 Thèmes disponibles</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="border-2 border-primary rounded-lg p-2 cursor-pointer hover-lift">
              <div className="flex gap-1 mb-2">
                <div className="w-4 h-4 rounded-full bg-primary"></div>
                <div className="w-4 h-4 rounded-full bg-accent"></div>
                <div className="w-4 h-4 rounded-full bg-text-main"></div>
              </div>
              <p className="text-xs font-semibold">WhatsApp</p>
              <p className="text-xs text-text-subtle">Par défaut</p>
            </div>
            <div className="border border-border-main rounded-lg p-2 cursor-pointer hover-lift">
              <div className="flex gap-1 mb-2">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                <div className="w-4 h-4 rounded-full bg-pink-500"></div>
              </div>
              <p className="text-xs font-semibold">Nuit</p>
              <p className="text-xs text-text-subtle">Premium</p>
            </div>
          </div>
          <button className="w-full bg-primary text-white py-2 rounded-full text-sm font-semibold flex items-center justify-center gap-2">
            <Wand2 className="w-4 h-4" />
            Créer mon thème
          </button>
        </div>
      </ChatPreview>
    )
  },
  {
    id: 17,
    title: "Mode Ultra Léger",
    description: "Version optimisée pour téléphones avec peu de mémoire. Interface simplifiée et rapide.",
    category: 'custom',
    icon: <Zap className="w-6 h-6" />,
    preview: (
      <ChatPreview title="Mode Léger">
        <div className="space-y-2">
          <div className="bg-panel border border-border-main rounded p-2 flex items-center gap-2">
            <div className="w-8 h-8 bg-text-subtle/20 rounded-full"></div>
            <div className="flex-1">
              <div className="h-3 bg-text-subtle/20 rounded w-20 mb-1"></div>
              <div className="h-2 bg-text-subtle/10 rounded w-32"></div>
            </div>
          </div>
          <div className="bg-primary/5 p-3 rounded border-l-4 border-primary">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Mode Léger Activé</span>
            </div>
            <ul className="text-xs text-text-subtle space-y-1">
              <li>✓ 80% moins de données</li>
              <li>✓ 3x plus rapide</li>
              <li>✓ Batterie économisée</li>
            </ul>
          </div>
        </div>
      </ChatPreview>
    )
  },
  {
    id: 18,
    title: "Automatisations",
    description: "Configurez des réponses automatiques, messages de bienvenue et bots simples pour vos groupes.",
    category: 'custom',
    icon: <Zap className="w-6 h-6" />,
    preview: (
      <ChatPreview title="Bot Actif">
        <MessageBubble text="Bonjour !" time="14:25" />
        <div className="bg-panel p-3 rounded-lg border-l-4 border-accent animate-slide-up">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center">
              <Zap className="w-3 h-3 text-accent" />
            </div>
            <span className="text-xs text-accent font-semibold">Réponse Automatique</span>
          </div>
          <p className="text-sm text-text-main">
            Merci pour votre message ! Je suis actuellement indisponible. Je vous réponds dès que possible 😊
          </p>
          <div className="text-xs text-text-subtle mt-2">
            🤖 Message automatique configuré
          </div>
        </div>
      </ChatPreview>
    )
  },
  {
    id: 19,
    title: "Verrouillage Conversations",
    description: "Protégez vos conversations sensibles avec un code PIN, empreinte digitale ou Face ID unique.",
    category: 'privacy',
    icon: <Lock className="w-6 h-6" />,
    preview: (
      <ChatPreview title="Chats Verrouillés">
        <div className="bg-panel p-4 rounded-lg border border-border-main">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
          </div>
          <p className="text-center text-sm font-semibold mb-2">Chat Verrouillé</p>
          <p className="text-center text-xs text-text-subtle mb-4">
            Utilisez votre empreinte digitale pour déverrouiller
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3,4,5,6,7,8,9].map((num) => (
              <button 
                key={num} 
                className="aspect-square bg-panel-hover rounded-full flex items-center justify-center font-semibold hover:bg-primary/10 transition-colors"
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </ChatPreview>
    )
  },
  {
    id: 20,
    title: "Messages Auto-Destructibles",
    description: "Définissez précisément quand vos messages doivent disparaître : de 5 secondes à 1 an.",
    category: 'privacy',
    icon: <Clock className="w-6 h-6" />,
    preview: (
      <ChatPreview title="Messages Éphémères">
        <div className="bg-bubble-out p-3 rounded-lg ml-auto max-w-[80%] relative overflow-hidden">
          <p className="text-sm mb-2">Message confidentiel 🔒</p>
          <div className="flex items-center gap-2 text-xs text-text-subtle">
            <Clock className="w-3 h-3" />
            <span>Disparaît dans 5 min</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-error/20">
            <div className="h-full bg-error w-2/3 animate-pulse-typing"></div>
          </div>
        </div>
        <div className="text-xs text-text-subtle text-center mt-2 flex items-center justify-center gap-1">
          <Shield className="w-3 h-3" />
          Disparition automatique activée
        </div>
      </ChatPreview>
    )
  }
];

export default function Features() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentFeature = features[currentIndex];

  // Auto-play
  useEffect(() => {
    if (!isAutoPlaying) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % features.length);
    }, 5000); // Change toutes les 5 secondes

    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  // Navigation
  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % features.length);
    setIsAutoPlaying(false);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + features.length) % features.length);
    setIsAutoPlaying(false);
  };

  const goToIndex = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  // Touch/Swipe handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrev();
    }
  };

  // Catégories
  const categories = {
    privacy: { name: 'Confidentialité', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    messages: { name: 'Messages', color: 'text-primary', bg: 'bg-primary/10' },
    media: { name: 'Médias', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    groups: { name: 'Groupes', color: 'text-accent', bg: 'bg-accent/10' },
    calls: { name: 'Appels', color: 'text-orange-500', bg: 'bg-orange-500/10' },
    custom: { name: 'Personnalisation', color: 'text-pink-500', bg: 'bg-pink-500/10' }
  };

  return (
    <section className="py-16 sm:py-24 bg-background-app" id="features">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16 animate-slide-up">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-main mb-4">
            20 Fonctionnalités Révolutionnaires
          </h2>
          <p className="text-lg sm:text-xl text-text-subtle max-w-2xl mx-auto">
            Découvrez les fonctionnalités que vous avez toujours rêvé d'avoir sur WhatsApp
          </p>
        </div>

        {/* Contenu Principal */}
        <div 
          ref={containerRef}
          className="max-w-7xl mx-auto text-center animate-slide-up flex justify-center items-center"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 flex justify-center items-center">
            
            {/* Partie Gauche - Description */}
            <div className="space-y-6 animate-slide-in-left">
              
              {/* Catégorie Badge */}
              <div className="flex items-center gap-2 mx-auto ml-16 sm:ml-0">
                <span className={`
                  px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2
                  ${categories[currentFeature.category].bg}
                  ${categories[currentFeature.category].color}
                `}>
                  {currentFeature.icon}
                  {categories[currentFeature.category].name}
                </span>
                <span className="text-sm text-text-subtle">
                  {currentIndex + 1} / {features.length}
                </span>
              </div>

              {/* Titre et Description */}
              <div className="space-y-4">
                <h3 className="text-2xl sm:text-4xl font-bold text-text-main">
                  {currentFeature.title}
                </h3>
                <p className="text-md text-text-subtle leading-relaxed ml-16 mr-16 sm:text-lg text-text-subtle leading-relaxed">
                  {currentFeature.description}
                </p>
              </div>

              {/* Navigation Boutons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={goToPrev}
                  className="w-12 h-12 rounded-full bg-panel border-2 border-border-main hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center group ripple"
                  aria-label="Fonctionnalité précédente"
                >
                  <ChevronLeft className="w-6 h-6 text-text-main group-hover:text-primary transition-colors" />
                </button>

                <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-whatsapp pb-2">
                  {features.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToIndex(index)}
                      className={`
                        h-2 rounded-full transition-all flex-shrink-0
                        ${index === currentIndex 
                          ? 'w-12 bg-primary' 
                          : 'w-2 bg-border-main hover:bg-text-subtle'
                        }
                      `}
                      aria-label={`Aller à la fonctionnalité ${index + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={goToNext}
                  className="w-12 h-12 rounded-full bg-panel border-2 border-border-main hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center group ripple"
                  aria-label="Fonctionnalité suivante"
                >
                  <ChevronRight className="w-6 h-6 text-text-main group-hover:text-primary transition-colors" />
                </button>
              </div>

              {/* Auto-play Toggle */}
              <div className="flex items-center gap-3 text-sm text-text-subtle ml-16 sm:ml-0">
                <button
                  onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                  className={`
                    px-4 py-2 rounded-full border transition-all
                    ${isAutoPlaying 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-border-main hover:border-primary'
                    }
                  `}
                >
                  {isAutoPlaying ? '⏸️ Pause' : '▶️ Lecture Auto'}
                </button>
                <span className="text-xs">
                  {isAutoPlaying ? 'Défilement automatique actif' : 'Défilement en pause'}
                </span>
              </div>

            </div>

            {/* Partie Droite - Prévisualisation */}
            <div className="animate-slide-in-right ml-16 sm:ml-0 mr-16 sm:mr-0">
              <div className="relative">
                {/* Effet de glow derrière */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl blur-3xl opacity-50"></div>
                
                {/* Preview Container */}
                <div className="relative">
                  {currentFeature.preview}
                </div>

                {/* Smartphone Frame (optionnel) */}
                <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-panel rounded-full shadow-lg flex items-center justify-center border-4 border-background-app animate-bounce-in">
                  <Smartphone className="w-8 h-8 text-primary" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Instructions de swipe pour mobile */}
        <div className="mt-12 text-center lg:hidden animate-fade-in">
          <p className="text-sm text-text-subtle flex items-center justify-center gap-2">
            <span>👈</span>
            Glissez pour naviguer
            <span>👉</span>
          </p>
        </div>

      </div>
    </section>
  );
}