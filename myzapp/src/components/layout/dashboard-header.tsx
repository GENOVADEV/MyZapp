// src/components/layout/dashboard-header.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  Crown,
  Moon,
  Sun,
  ChevronDown,
  MessageCircle,
  CheckCircle2,
  Shield,
  CreditCard,
  HelpCircle,
  X,
  Menu,
  SearchIcon
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import ProfileDropdown from "./profileDropdown";

export default function DashboardHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Récupérer le plan de l'utilisateur
  const userPlan = (user as any)?.plan || "FREE";

  // Fermer les dropdowns au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toggle Dark Mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  // Gestion du mode mobile
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Notifications mockées
  const notifications = [
    {
      id: 1,
      type: "message",
      title: "Nouveau message",
      description: "Sophie Martin vous a envoyé un message",
      time: "Il y a 5 min",
      unread: true
    },
    {
      id: 2,
      type: "system",
      title: "Mise à jour disponible",
      description: "MyZapp v2.1 est maintenant disponible",
      time: "Il y a 2h",
      unread: true
    },
    {
      id: 3,
      type: "billing",
      title: "Paiement confirmé",
      description: "Votre abonnement a été renouvelé",
      time: "Hier",
      unread: false
    }
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 -mb-8 bg-panel border-b border-border-main backdrop-blur-sm bg-panel/95"
    >
      <div className="flex flex-col-3 items-center justify-between px-4 sm:px-6 lg:px-8 h-16">

        {/* Center - Search Bar */}
        <div className="flex-1 flex justify-center px-2 sm:px-4">
          <div className="flex flex-col-1 space-y-2 relative w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-xl">
            <div>
              <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-text-subtle"/>
            </div>
            <div className="w-full ml-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher des conversations, contacts..."
                className="w-full pl-10 pr-4 py-2 bg-background-app border border-border-main rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all h-10"
                aria-label="Barre de recherche"
              />
            </div>
          </div>
        </div>



        {/* Right - Actions */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-4">

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-panel-hover transition-colors"
            aria-label="Basculer le mode sombre"
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-text-subtle" />
            ) : (
              <Moon className="w-5 h-5 text-text-subtle" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-panel-hover transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-6 h-6 text-text-subtle" />
              {unreadCount > 0 && (
                <span className="absolute top-2  right-2 w-2 h-2 bg-error rounded-full border border-white animate-pulse"></span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-panel rounded-xl shadow-2xl border border-border-main overflow-hidden z-50">
                <div className="p-4 border-b border-border-main flex items-center justify-between">
                  <h3 className="font-semibold text-text-main">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-xs px-2 py-1 bg-primary text-white rounded-full">
                      {unreadCount} nouvelles
                    </span>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto scrollbar-whatsapp">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`
                        p-4 border-b border-border-main hover:bg-panel-hover transition-colors cursor-pointer
                        ${notification.unread ? 'bg-primary/5' : ''}
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center
                          ${notification.type === "message" ? "bg-accent/20 text-accent" : ""}
                          ${notification.type === "system" ? "bg-primary/20 text-primary" : ""}
                          ${notification.type === "billing" ? "bg-amber-500/20 text-amber-500" : ""}
                        `}>
                          {notification.type === "message" && <MessageCircle className="w-4 h-4" />}
                          {notification.type === "system" && <Bell className="w-4 h-4" />}
                          {notification.type === "billing" && <CreditCard className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-text-main truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-text-subtle mt-0.5 truncate">
                            {notification.description}
                          </p>
                          <p className="text-xs text-text-subtle mt-1">{notification.time}</p>
                        </div>
                        {notification.unread && (
                          <div className="w-2 h-2 bg-primary rounded-full mt-1"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-border-main text-center">
                  <Link
                    href="/dashboard/notifications"
                    className="text-sm text-primary hover:text-primary-darker font-semibold"
                  >
                    Voir toutes les notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="relative" ref={profileRef}>
            <ProfileDropdown
              isOpen={isProfileOpen}
              setIsOpen={setIsProfileOpen}
              dropdownPosition="right"
            />
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Mobile Search Menu */}
      {isMobileMenuOpen && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-panel border-b border-border-main p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-subtle" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-10 pr-4 py-2 bg-background-app border border-border-main rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
}
