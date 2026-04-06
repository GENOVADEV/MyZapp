// src/app/dashboard/page.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useBot } from "@/contexts/BotContext";
import { useContacts } from "@/hooks/useContacts";
import { useConversations } from "@/hooks/useConversations";
import {
  MessageCircle,
  Users,
  TrendingUp,
  Clock,
  Crown,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Star,
  RefreshCw,
  CloudSync
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import LoadingSpinner from "../ui/LoadingSpinner";
import { Card, CardContent } from "../ui/card";

export default function DashboardPage() {
  const { user } = useAuth();
  const {
    status,
    isConnected,
    syncProgress,
    isSyncing,
  } = useBot();

  const { contacts, totalContacts, refreshContacts: refreshContactsHook } = useContacts();
  const { conversations, totalConversations, refreshConversations: refreshConversationsHook } = useConversations();

  const userPlan = (user as any)?.plan || "FREE";
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // État local pour les données mockées (temporaire)
  const [stats, setStats] = useState([
    {
      id: 1,
      label: "Messages envoyés",
      value: "1,247",
      change: "+12%",
      trend: "up",
      icon: <MessageCircle className="w-6 h-6" />
    },
    {
      id: 2,
      label: "Contacts actifs",
      value: "84",
      change: "+5",
      trend: "up",
      icon: <Users className="w-6 h-6" />
    },
    {
      id: 3,
      label: "Taux de réponse",
      value: "94%",
      change: "+3%",
      trend: "up",
      icon: <TrendingUp className="w-6 h-6" />
    },
    {
      id: 4,
      label: "Temps de réponse",
      value: "2.4h",
      change: "-15%",
      trend: "down",
      icon: <Clock className="w-6 h-6" />
    }
  ]);

  // Rafraîchir les données au chargement
  useEffect(() => {
    const loadData = async () => {
      try {
        await refreshContactsHook();
        await refreshConversationsHook();

        // Mettre à jour les stats avec les données réelles
        setStats(prev => prev.map(stat => {
          if (stat.id === 2) {
            return { ...stat, value: totalContacts.toString() };
          }
          return stat;
        }));
      } catch (error) {
        console.error('Erreur chargement données:', error);
      }
    };

    loadData();
  }, [refreshContactsHook, refreshConversationsHook, totalContacts]);

  // Fonction pour rafraîchir toutes les données
  const handleRefreshAll = async () => {
    setIsLoading(true)
    try {
      await refreshContactsHook();
      await refreshConversationsHook();
      setIsLoading(false)
      // Ajouter d'autres rafraîchissements si nécessaire
    } catch (error) {
      console.error('Erreur rafraîchissement données:', error);
      setIsLoading(false)
    }
  };

  // Conversations récentes (basées sur les données réelles)
  const recentConversations = conversations.slice(0, 3).map(conv => ({
    id: conv.id,
    name: conv.name || conv.contact?.name || conv.group?.name || 'Sans nom',
    lastMessage: conv.messages?.[0]?.content || 'Aucun message',
    time: conv.lastMessageAt ? formatTimeAgo(conv.lastMessageAt) : 'Jamais',
    unread: conv.unreadCount,
    avatar: getInitials(conv.name || conv.contact?.name || conv.group?.name || 'CN'),
    online: false, // À déterminer selon la logique métier
    isGroup: conv.type === 'GROUP'
  }));

  // Tâches rapides
  const quickActions = [
    {
      id: 1,
      title: "Nouvelle conversation",
      description: "Démarrer un nouveau chat",
      icon: <MessageCircle className="w-5 h-5" />,
      href: "/dashboard?new=true",
      color: "primary"
    },
    {
      id: 2,
      title: "Programmer un message",
      description: "Planifier l'envoi d'un message",
      icon: <Clock className="w-5 h-5" />,
      href: "/dashboard/scheduled",
      color: "accent",
      premium: userPlan === "FREE"
    },
    {
      id: 3,
      title: "Créer un bot",
      description: "Automatiser vos réponses",
      icon: <Zap className="w-5 h-5" />,
      href: "/dashboard/bots",
      color: "purple",
      premium: userPlan === "FREE" || userPlan === "YOUNG"
    }
  ];

  return (
    <div className="space-y-6">

      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-primary to-accent p-6 sm:p-8 rounded-2xl text-white animate-slide-up">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              Bonjour {user?.name?.split(' ')[1] || user?.name?.split(' ')[0] || 'Utilisateur'} ! 👋
            </h1>
            <p className="text-white/90">
              {isConnected ?
                `WhatsApp connecté • ${totalContacts} contacts • ${totalConversations} conversations` :
                'Bienvenue sur votre tableau de bord MyZapp'
              }
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full flex items-center gap-2">
              <Crown className="w-4 h-4" />
              <span className="font-semibold capitalize">{userPlan.toLowerCase()}</span>
            </div>
            <button
              onClick={handleRefreshAll}
              className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              title="Rafraîchir les données"
            >
              {isLoading ? (
                <LoadingSpinner loading={false} fullScreen={false} />
              ) : (<RefreshCw className="w-4 h-4" />)}
            </button>
          </div>
        </div>
      </div>

      {/* Synchronisation en cours */}
      {isSyncing && (
        <div className="bg-primary/10 border border-primary/30 p-4 rounded-xl flex items-start gap-3 animate-slide-up">
          <CloudSync className="w-5 h-5 text-primary animate-spin flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-text-main mb-1">Synchronisation en cours</h3>
            <div className="space-y-2">
              {syncProgress.map((progress, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-text-subtle">
                    {progress.type === 'user' && 'Profil utilisateur'}
                    {progress.type === 'contacts' && 'Contacts'}
                    {progress.type === 'conversations' && 'Conversations'}
                  </span>
                  <span className={`
                    text-xs font-semibold px-2 py-1 rounded-full
                    ${progress.status === 'completed' ? 'text-accent bg-accent/10' : ''}
                    ${progress.status === 'in_progress' ? 'text-primary bg-primary/10' : ''}
                    ${progress.status === 'error' ? 'text-error bg-error/10' : ''}
                    ${progress.status === 'pending' ? 'text-text-subtle bg-border-main' : ''}
                  `}>
                    {progress.status === 'completed' && '✓'}
                    {progress.status === 'in_progress' && '⟳'}
                    {progress.status === 'error' && '✗'}
                    {progress.status === 'pending' && '⏱'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Connection Status */}
      {!isConnected && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3 animate-slide-up">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-text-main mb-1">WhatsApp non connecté</h3>
            <p className="text-sm text-text-subtle mb-3">
              Connectez votre compte WhatsApp pour commencer à utiliser MyZapp
            </p>
            <Link
              href="/dashboard/myzappBot/login"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-darker transition-colors text-sm font-semibold"
            >
              Connecter maintenant
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <Card className="border-slate-200">
        <CardContent className="p-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {stats.map((stat, idx) => (
              <div
                key={stat.id}
                className="panel-card p-6 rounded-xl hover-lift animate-slide-up"
                style={{ animationDelay: `${(idx + 2) * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    {stat.icon}
                  </div>
                  <span className={`
                text-sm font-semibold px-2 py-1 rounded-full
                ${stat.trend === "up" ? "text-accent bg-accent/10" : "text-error bg-error/10"}
              `}>
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-text-main mb-1">{stat.value}</h3>
                <p className="text-sm text-text-subtle">{stat.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Recent Conversations */}
        <div className="lg:col-span-2 panel-card rounded-xl overflow-hidden animate-slide-up">
          <div className="p-6 border-b border-border-main flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-text-main">Conversations récentes</h2>
              <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                {totalConversations} total(s)
              </span>
            </div>
            <Link
              href="/dashboard/conversations"
              className="text-sm text-primary hover:text-primary-darker font-semibold"
            >
              Voir tout
            </Link>
          </div>
          <div className="divide-y divide-border-main">
            {recentConversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/dashboard/chat/${conv.id}`}
                className="flex items-center gap-4 p-4 hover:bg-panel-hover transition-colors"
              >
                <div className="relative">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center font-bold text-white
                    ${conv.isGroup ? 'bg-accent' : 'bg-gradient-to-br from-primary to-accent'}
                  `}>
                    {conv.avatar}
                  </div>
                  {conv.online && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-accent rounded-full border-2 border-panel"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-text-main truncate">{conv.name}</h3>
                    <span className="text-xs text-text-subtle flex-shrink-0">{conv.time}</span>
                  </div>
                  <p className="text-sm text-text-subtle truncate">{conv.lastMessage}</p>
                </div>
                {conv.unread > 0 && (
                  <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {conv.unread}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Actions & Sidebar */}
        <div className="space-y-6">
          <div className="panel-card rounded-xl overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-border-main">
              <h2 className="text-lg font-bold text-text-main">Actions rapides</h2>
            </div>
            <div className="p-4 space-y-3">
              {quickActions.map((action) => (
                <Link
                  key={action.id}
                  href={action.premium ? "/dashboard/upgrade" : action.href}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl border-2 border-border-main
                    hover:border-primary hover:bg-primary/5 transition-all group
                    ${action.premium ? 'opacity-75' : ''}
                  `}
                >
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center
                    ${action.color === "primary" ? "bg-primary/10 text-primary" : ""}
                    ${action.color === "accent" ? "bg-accent/10 text-accent" : ""}
                    ${action.color === "purple" ? "bg-purple-500/10 text-purple-500" : ""}
                  `}>
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-text-main">{action.title}</h3>
                      {action.premium && <Crown className="w-3 h-3 text-amber-500" />}
                    </div>
                    <p className="text-xs text-text-subtle">{action.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-text-subtle group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </div>

          {/* Upgrade CTA */}
          {(userPlan === "FREE" || userPlan === "YOUNG") && (
            <div className="bg-gradient-to-br from-primary to-accent p-6 rounded-xl text-white animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-5 h-5 fill-current" />
                <h3 className="font-bold">Passez au Premium</h3>
              </div>
              <p className="text-sm text-white/90 mb-4">
                Débloquez toutes les fonctionnalités exclusives et boostez votre productivité
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Messages programmés illimités</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Automatisations intelligentes</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Support prioritaire 24/7</span>
                </li>
              </ul>
              <Link
                href="/dashboard/upgrade"
                className="block w-full bg-white text-primary py-2.5 rounded-lg text-center font-semibold hover:bg-white/90 transition-colors"
              >
                Voir les offres
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Fonctions utilitaires
function formatTimeAgo(date: Date): string {
  if (!date) return "";
  const realDate = new Date(date);
  const now = new Date();
  const diffMs = Math.floor(now.getTime() - realDate.getTime());
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) {
    return `Il y a ${diffMins} min`;
  } else if (diffHours < 24) {
    return `Il y a ${diffHours} h`;
  } else {
    return `Il y a ${diffDays} j`;
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
}
