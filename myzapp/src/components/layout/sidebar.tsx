// src/components/layout/sidebar.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/icon"
import {
  MessageCircle,
  Users,
  Settings,
  Crown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Bell,
  Zap,
  BarChart3,
  Folder,
  Shield,
  Headphones,
  Sparkles,
  Bot,
  Calendar,
  PhoneCall,
  Archive,
  Star,
  CreditCard,
  HelpCircle,
  Menu,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBot } from "@/contexts/BotContext";
import ProfileDropdown from "./profileDropdown";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: string | number;
  badgeColor?: "primary" | "accent" | "error" | "warning";
  requiresPlan?: ("FREE" | "YOUNG" | "AGENT" | "BUSINESS" | "PRO")[];
  comingSoon?: boolean;
}

interface NavSection {
  id: string;
  label?: string;
  items: NavItem[];
}

// ============================================================================
// CONFIGURATION DE LA NAVIGATION
// ============================================================================

const getNavigationSections = (userPlan: string = "FREE"): NavSection[] => [
  {
    id: "main",
    items: [
      {
        id: "conversations",
        label: "Conversations",
        icon: <MessageCircle className="w-5 h-5" />,
        href: "/dashboard",
        badge: 3,
        badgeColor: "primary"
      },
      {
        id: "contacts",
        label: "Contacts",
        icon: <Users className="w-5 h-5" />,
        href: "/dashboard/contacts"
      },
      {
        id: "groups",
        label: "Groupes",
        icon: <Users className="w-5 h-5" />,
        href: "/dashboard/groups",
        badge: "New",
        badgeColor: "accent"
      }
    ]
  },
  {
    id: "tools",
    label: "Outils",
    items: [
      {
        id: "scheduled",
        label: "Messages programmés",
        icon: <Calendar className="w-5 h-5" />,
        href: "/dashboard/scheduled",
        requiresPlan: ["AGENT", "BUSINESS", "PRO"]
      },
      {
        id: "bots",
        label: "Automatisations",
        icon: <Bot className="w-5 h-5" />,
        href: "/dashboard/bots",
        requiresPlan: ["AGENT", "BUSINESS", "PRO"]
      },
      {
        id: "folders",
        label: "Dossiers",
        icon: <Folder className="w-5 h-5" />,
        href: "/dashboard/folders",
        requiresPlan: ["AGENT", "BUSINESS", "PRO"]
      },
      {
        id: "calls",
        label: "Appels",
        icon: <PhoneCall className="w-5 h-5" />,
        href: "/dashboard/calls"
      }
    ]
  },
  {
    id: "analytics",
    label: "Analyses",
    items: [
      {
        id: "statistics",
        label: "Statistiques",
        icon: <BarChart3 className="w-5 h-5" />,
        href: "/dashboard/statistics",
        requiresPlan: ["BUSINESS", "PRO"]
      },
      {
        id: "archive",
        label: "Archives",
        icon: <Archive className="w-5 h-5" />,
        href: "/dashboard/archive"
      }
    ]
  },
  {
    id: "settings",
    label: "Paramètres",
    items: [
      {
        id: "profile",
        label: "Mon profil",
        icon: <User className="w-5 h-5" />,
        href: "/dashboard/profile"
      },
      {
        id: "notifications",
        label: "Notifications",
        icon: <Bell className="w-5 h-5" />,
        href: "/dashboard/notifications"
      },
      {
        id: "security",
        label: "Sécurité",
        icon: <Shield className="w-5 h-5" />,
        href: "/dashboard/security"
      },
      {
        id: "billing",
        label: "Abonnement",
        icon: <CreditCard className="w-5 h-5" />,
        href: "/dashboard/billing"
      },
      {
        id: "settings",
        label: "Paramètres",
        icon: <Settings className="w-5 h-5" />,
        href: "/dashboard/settings"
      }
    ]
  },
  {
    id: "support",
    items: [
      {
        id: "help",
        label: "Centre d'aide",
        icon: <HelpCircle className="w-5 h-5" />,
        href: "/dashboard/help"
      },
      {
        id: "support",
        label: "Support",
        icon: <Headphones className="w-5 h-5" />,
        href: "/dashboard/support",
        badge: userPlan === "BUSINESS" || userPlan === "PRO" ? "24/7" : undefined,
        badgeColor: "accent"
      }
    ]
  }
];

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { status: botStatus } = useBot();
  const sidebarRef = useRef<HTMLDivElement>(null);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(288); // Valeur par défaut en px (w-72)
  const [isDragging, setIsDragging] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);


  // Récupérer le plan de l'utilisateur (à adapter selon votre structure)
  const userPlan = (user as any)?.plan || "FREE";
  const navigationSections = getNavigationSections(userPlan);

  // Initialiser après montage côté client (évite hydration mismatch)
  useEffect(() => {
    setIsMounted(true);
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
      const width = parseInt(savedWidth);
      if (width >= 200 && width <= 500) {
        setSidebarWidth(width);
      }
    }
  }, []);

  // Sauvegarder la largeur avec délai (débounce)
  useEffect(() => {
    if (isDragging) return;

    const timer = setTimeout(() => {
      localStorage.setItem('sidebarWidth', sidebarWidth.toString());
    }, 300);

    return () => clearTimeout(timer);
  }, [sidebarWidth, isDragging]);

  // Fermer le menu mobile sur changement de route
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Empêcher le scroll du body quand le menu mobile est ouvert
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileOpen]);

  // Gestion du redimensionnement
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!sidebarRef.current) return;

      const sidebarRect = sidebarRef.current.getBoundingClientRect();
      const newWidth = e.clientX - sidebarRect.left;

      // Limites de redimensionnement
      const minSize = 200;
      const maxSize = 500;

      if (newWidth >= minSize && newWidth <= maxSize) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
      // Sauvegarder la largeur après redimensionnement
      localStorage.setItem('sidebarWidth', sidebarWidth.toString());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Changer le curseur pendant le drag
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isDragging, sidebarWidth]);

  // Vérifier si un item nécessite un upgrade
  const isLocked = (item: NavItem): boolean => {
    if (!item.requiresPlan) return false;
    return !item.requiresPlan.includes(userPlan as any);
  };

  // Obtenir le badge de statut du bot
  const getBotStatusBadge = () => {
    switch (botStatus) {
      case "connected":
        return { icon: <CheckCircle2 className="w-3 h-3" />, color: "text-accent", label: "Connecté" };
      case "connecting":
        return { icon: <Loader2 className="w-3 h-3 animate-spin" />, color: "text-primary", label: "Connexion..." };
      case "error":
        return { icon: <AlertCircle className="w-3 h-3" />, color: "text-error", label: "Erreur" };
      default:
        return { icon: <AlertCircle className="w-3 h-3" />, color: "text-text-subtle", label: "Déconnecté" };
    }
  };

  const botStatusBadge = getBotStatusBadge();

  return (
    <>
      {/* Overlay Mobile */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen
          bg-panel border-r border-border-main
          transition-all duration-300 ease-in-out
          flex flex-col overflow-hidden
          ${isMobileOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0'}
        `}
        style={{
          width: !isMounted
            ? '288px'
            : window.innerWidth >= 1024
              ? isCollapsed ? '64px' : `${sidebarWidth}px`
              : isMobileOpen ? '288px' : '0px'
        }}
      >
        {/* Header */}
        <div className={`
          p-4 border-b border-border-main flex items-center justify-between -mt-3
          ${isCollapsed ? 'flex-col gap-2' : ''}
          min-h-max
        `}>
          {isMobileOpen ? (
            <>
              {/* Logo Mobile */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg">
                  <Icon />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-text-main">MyZapp</h1>
                  <p className="text-xs text-text-subtle">Dashboard</p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Logo Desktop */}
              <Link
                href="/dashboard"
                className={`
                  flex items-center gap-3 group
                  ${isCollapsed ? 'justify-center' : ''}
                `}
              >
                <div className="w-10 h-10 -mt-1 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Icon />
                </div>
                {!isCollapsed && (
                  <div>
                    <h1 className="text-lg font-bold text-text-main">MyZapp</h1>
                    <p className="text-xs text-text-subtle">Dashboard</p>
                  </div>
                )}
              </Link>
            </>
          )}

          {isMobileOpen && (
            <div className="flex items-center gap-2">
              {/* Bouton fermer (mobile) */}
              <button
                onClick={() => setIsMobileOpen(false)}
                className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-panel-hover transition-colors"
                aria-label="Fermer le menu"
              >
                <X className="w-5 h-5 text-text-subtle" />
              </button>
            </div>
          )}

          {/* Bouton collapse (desktop) */}
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-panel-hover transition-colors"
              aria-label={isCollapsed ? "Étendre" : "Réduire"}
            >
              <ChevronLeft className="w-5 h-5 text-text-subtle" />
            </button>
          )}
        </div>

        {/* User Card */}
        {!isCollapsed && user && (
          <div className="p-4 border-b border-border-main">
            <div className="flex items-center gap-3 p-2 -mb-2 -mt-2 rounded-xl bg-panel-hover hover:bg-primary/5 transition-colors cursor-pointer group" onClick={() => setIsProfileOpen(!isProfileOpen)}>
              <div className="relative">
                <ProfileDropdown
                  isOpen={isProfileOpen}
                  setIsOpen={setIsProfileOpen}
                  dropdownPosition="left"
                  isSidebar={true}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text-main truncate">{user.name || "Utilisateur"}</p>
                <div className="flex items-center gap-1.5">
                  <Crown className="w-3 h-3 text-amber-500" />
                  <span className="text-xs text-text-subtle capitalize">{userPlan.toLowerCase()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statut Bot WhatsApp */}
        {!isCollapsed && (
          <div className="px-4 pt-4 p-2 -mb-2 -mt-2">
            <Link
              href="/dashboard/whatsapp"
              className="flex items-center gap-3 p-3 rounded-xl bg-panel-hover hover:bg-primary/5 transition-all group"
            >
              <div className={`w-2 h-2 rounded-full ${botStatus === "connected" ? "bg-accent" :
                botStatus === "connecting" ? "bg-primary animate-pulse" :
                  "bg-text-subtle"
                }`}></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-main">WhatsApp Bot</p>
                <div className="flex items-center gap-1.5">
                  {botStatusBadge.icon}
                  <span className={`text-xs ${botStatusBadge.color}`}>
                    {botStatusBadge.label}
                  </span>
                </div>
              </div>
              <Zap className="w-4 h-4 text-text-subtle group-hover:text-primary transition-colors" />
            </Link>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-whatsapp p-3 lg:p-4 space-y-4 lg:space-y-6">
          {navigationSections.map((section) => (
            <div key={section.id} className="space-y-1">
              {/* Section Label */}
              {section.label && !isCollapsed && (
                <p className="text-xs font-semibold text-text-subtle uppercase tracking-wider px-3 mb-3 hidden lg:block">
                  {section.label}
                </p>
              )}

              {/* Section Items */}
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                const locked = isLocked(item);

                return (
                  <Link
                    key={item.id}
                    href={locked ? "/dashboard/upgrade" : item.href}
                    className={`
                      group relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                      transition-all duration-200 lg:duration-300
                      ${isCollapsed ? 'justify-center lg:justify-center' : 'justify-start'}
                      ${isActive
                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                        : 'text-text-main hover:bg-panel-hover'
                      }
                      ${locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                      ${item.comingSoon ? 'opacity-60' : ''}
                    `}
                    onClick={(e) => {
                      if (locked || item.comingSoon) {
                        e.preventDefault();
                      }
                    }}
                  >
                    {/* Icon */}
                    <span className={`
                flex-shrink-0
                ${isCollapsed ? '' : ''}
                ${isActive ? 'text-white' : 'text-text-subtle group-hover:text-primary'}
                transition-colors
              `}>
                      {item.icon}
                    </span>

                    {/* Label */}
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 font-medium text-sm">
                          {item.label}
                        </span>

                        {/* Badges */}
                        <div className="flex items-center gap-2 ml-2">
                          {locked && (
                            <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          )}

                          {item.comingSoon && (
                            <span className="text-xs px-2 py-0.5 bg-text-subtle/10 rounded-full whitespace-nowrap">
                              Bientôt
                            </span>
                          )}

                          {item.badge && !locked && (
                            <span className={`
                        text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap flex-shrink-0
                        ${item.badgeColor === "primary" ? "bg-primary text-white" : ""}
                        ${item.badgeColor === "accent" ? "bg-accent text-white" : ""}
                        ${item.badgeColor === "error" ? "bg-error text-white" : ""}
                        ${item.badgeColor === "warning" ? "bg-warning text-white" : ""}
                        ${!item.badgeColor ? "bg-text-subtle/20 text-text-subtle" : ""}
                      `}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </>
                    )}

                    {/* Tooltip pour sidebar collapsed */}
                    {isCollapsed && (
                      <div className="
                        absolute left-full ml-2 px-3 py-2 bg-panel-hover rounded-lg
                        text-sm font-medium whitespace-nowrap
                        opacity-0 invisible group-hover:opacity-100 group-hover:visible
                        transition-all duration-200 pointer-events-none
                        border border-border-main shadow-lg z-50
                      ">
                        {item.label}
                        {locked && (
                          <Crown className="inline-block w-3 h-3 ml-1 text-amber-500" />
                        )}
                      </div>
                    )}

                    {/* Badge dot pour collapsed sidebar */}
                    {isCollapsed && item.badge && typeof item.badge === "number" && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer - Upgrade CTA */}
        {!isCollapsed && (userPlan === "FREE" || userPlan === "YOUNG") && (
          <div className="p-4 border-t border-border-main">
            <div className="bg-gradient-to-br from-primary to-accent p-3 rounded-xl text-white space-y-1 -mt-2 -mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-bold">Passez au Premium</h3>
              </div>
              <p className="text-sm text-white/90">
                Débloquez toutes les fonctionnalités exclusives
              </p>
              <Link
                href="/dashboard/upgrade"
                className="block w-full bg-white text-primary py-2 rounded-lg text-center font-semibold hover:bg-white/90 transition-colors"
              >
                Voir les offres
              </Link>
            </div>
          </div>
        )}

        {/* Footer - Logout */}
        <div className="p-2 border-t border-border-main -mt-1 mb-1">
          <button
            onClick={logout}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
              text-error hover:bg-error/10 transition-all
              ${isCollapsed ? 'justify-center' : ''}
            `}
          >
            <LogOut className="w-5 h-5" />
            {!isCollapsed && (
              <span className="font-medium text-sm">Déconnexion</span>
            )}
          </button>
        </div>

        {/* Handle de redimensionnement (visible uniquement sur PC et non-collapsed) */}
        {!isCollapsed && (
          <div
            className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:w-1.5 bg-transparent hover:bg-primary/30 transition-all duration-200 hidden lg:block group"
            onMouseDown={() => setIsDragging(true)}
            aria-label="Redimensionner le sidebar vers la droite"
            title="Glissez pour redimensionner"
          >
            {/* Indicateur visuel au survol */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-primary opacity-0 group-hover:opacity-100 rounded-full transition-opacity" />
          </div>
        )}
      </aside>
    </>
  );
}
