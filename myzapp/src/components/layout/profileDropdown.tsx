// src/components/layout/ProfileDropdown.tsx
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User, Shield, CreditCard, Settings, HelpCircle, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';

interface ProfileDropdownProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  onOpenUpdateProfile?: () => void;
  triggerClassName?: string;
  dropdownPosition?: 'left' | 'right';
  dropdownWidth?: 'sm' | 'md' | 'lg';
  isSidebar?: boolean;
}

export default function ProfileDropdown({
  isOpen,
  setIsOpen,
  onOpenUpdateProfile,
  triggerClassName = "",
  dropdownPosition = "right",
  dropdownWidth = "md",
  isSidebar = false
}: ProfileDropdownProps) {
  const { user, logout } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const userPlan = (user as any)?.plan || "FREE";

  // Fermer le dropdown quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      setIsOpen(false);
    } catch (error) {
      setError("Erreur lors de la déconnexion.");
      toast.error("Erreur lors de la déconnexion.");
    }
  };

  const stringToColor = (string: string) => {
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
      hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 45%)`;
  };

  const bgColor = user?.name ? stringToColor(user?.name) : "#ccc";
  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";
  const name = user?.name || "Utilisateur";

  // Déterminer la largeur du dropdown
  const getWidthClass = () => {
    switch (dropdownWidth) {
      case 'sm': return 'w-64';
      case 'md': return 'w-72';
      case 'lg': return 'w-80';
      default: return 'w-72';
    }
  };

  // Déterminer la position du dropdown
  const getPositionClass = () => {
    return dropdownPosition === 'left' ? 'left-0' : 'right-0';
  };

  // Déterminer le style du trigger
  const getTriggerStyle = () => {
    if (isSidebar) {
      return "w-12 h-12";
    }
    return "w-8 h-8 sm:w-10 sm:h-10";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full transition-transform active:scale-95"
      >
        <Avatar className={getTriggerStyle()}>
          <AvatarImage src={user?.image || ""} alt={name} />
          <AvatarFallback
            className="text-white"
            style={{ backgroundColor: bgColor }}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border border-white bg-green-500 ${isOpen === false? 'bg-emerald-500' : 'bg-gray-400'}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`
            absolute mt-2 ${getPositionClass()} ${getWidthClass()} 
            bg-panel rounded-xl shadow-2xl border border-border-main overflow-hidden z-50
          `}
        >
          {/* User Info */}
          <div className="p-4 border-b border-border-main bg-gradient-to-br from-primary/5 to-accent/5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text-main truncate">
                  {name}
                </p>
                <p className="text-xs text-text-subtle truncate">
                  {user?.email || "Aucun email"}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 bg-panel rounded-full">
                <Crown className="w-3 h-3 text-amber-500" />
                <span className="text-xs font-semibold capitalize">
                  {userPlan.toLowerCase()}
                </span>
              </div>
              {userPlan !== "PRO" && (
                <Link
                  href="/dashboard/upgrade"
                  className="text-xs text-primary hover:text-primary-darker font-semibold"
                  onClick={() => setIsOpen(false)}
                >
                  Premium →
                </Link>
              )}
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            {[
              { href: "/dashboard/profile", icon: User, label: "Mon profil" },
              { href: "/dashboard/security", icon: Shield, label: "Sécurité" },
              { href: "/dashboard/billing", icon: CreditCard, label: "Abonnement" },
              { href: "/dashboard/settings", icon: Settings, label: "Paramètres" },
              { href: "/dashboard/help", icon: HelpCircle, label: "Centre d'aide" }
            ].map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-panel-hover transition-colors group"
                onClick={() => setIsOpen(false)}
              >
                <item.icon className="w-4 h-4 text-text-subtle group-hover:text-primary" />
                <span className="text-sm text-text-main group-hover:text-primary">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>

          {/* Logout */}
          <div className="p-2 border-t border-border-main">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-error/10 text-error transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Déconnexion</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
