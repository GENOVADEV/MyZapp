// src/components/layout/Header.tsx
"use client"; // Nécessaire si on ajoute de l'interactivité côté client plus tard (ex: menu mobile)

import Link from "next/link";
import { BotMessageSquare, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Header() {
  // État pour gérer le menu sur mobile
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Variable temporaire pour simuler l'état de connexion (on la rendra dynamique plus tard)
  const isLoggedIn = false; 

  return (
    <header className="sticky top-0 z-50 w-full bg-panel/80 backdrop-blur-md border-b border-border-main transition-smooth">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* --- LOGO --- */}
          <Link href="/" className="flex items-center gap-2 hover-lift">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white shadow-inner">
              <BotMessageSquare className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <span className="text-xl font-bold tracking-tight text-primary">MyZapp</span>
          </Link>

          {/* --- NAVIGATION DESKTOP --- */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-sm font-medium text-text-subtle hover:text-primary transition-colors">
              Fonctionnalités
            </Link>
            <Link href="#about" className="text-sm font-medium text-text-subtle hover:text-primary transition-colors">
              À propos
            </Link>
            <Link href="#billings"className="text-sm font-medium text-text-subtle hover:text-primary transition-colors">
              Tarifs
            </Link>
          </nav>

          {/* --- BOUTONS D'ACTION (Desktop) --- */}
          <div className="hidden md:flex items-center space-x-4">
            {isLoggedIn ? (
              <Link href="/dashboard" className="btn-primary animate-fade-in">
                Mon compte
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-text-main hover:text-primary transition-colors">
                  Se connecter
                </Link>
                <Link href="/register" className="btn-primary">
                  Essai Gratuit
                </Link>
              </>
            )}
          </div>

          {/* --- BOUTON MENU MOBILE --- */}
          <div className="flex md:hidden items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-text-main hover:text-primary focus:outline-none focus-ring p-2 rounded-md transition-colors"
              aria-label="Ouvrir le menu principal"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* --- NAVIGATION MOBILE (Menu déroulant) --- */}
      {isMobileMenuOpen && (
        <div className="md:hidden animate-slide-up bg-panel border-b border-border-main">
          <div className="px-2 pt-2 pb-4 space-y-1 sm:px-3">
            <Link 
              href="#fonctionnalites" 
              className="block px-3 py-2 rounded-md text-base font-medium text-text-main hover:bg-panel-hover hover:text-primary transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Fonctionnalités
            </Link>
            <Link 
              href="#features"
              className="block px-3 py-2 rounded-md text-base font-medium text-text-main hover:bg-panel-hover hover:text-primary transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              À propos
            </Link>
            <Link 
              href="#billings"
              className="block px-3 py-2 rounded-md text-base font-medium text-text-main hover:bg-panel-hover hover:text-primary transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Tarifs
            </Link>
            
            <div className="mt-4 pt-4 border-t border-border-main flex flex-col space-y-2 px-3">
              {isLoggedIn ? (
                <Link 
                  href="/dashboard" 
                  className="w-full text-center btn-primary"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Mon compte
                </Link>
              ) : (
                <>
                  <Link 
                    href="/login" 
                    className="w-full text-center py-2 text-base font-medium text-text-main border border-border-main rounded-md hover:bg-panel-hover transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Se connecter
                  </Link>
                  <Link 
                    href="/register" 
                    className="w-full text-center btn-primary"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Essai Gratuit
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}