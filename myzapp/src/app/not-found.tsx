// src/app/not-found.tsx
"use client";

import Link from 'next/link';
import { SearchX, ArrowLeft, Home, MessageCircle, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function NotFound() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-background-app text-text-main flex flex-col selection:bg-primary selection:text-white">

      <main className="flex-grow flex items-center justify-center p-6">
        <div className="max-w-lg w-full">
          
          {/* Card principale avec animation */}
          <div className={`panel-card p-8 sm:p-12 shadow-lg ${mounted ? 'animate-scale-in' : 'opacity-0'}`}>
            
            {/* Icône animée avec effet de flottement */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                {/* Cercle de fond avec pulse */}
                <div className="w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center relative animate-pulse-typing">
                  {/* Icône principale */}
                  <div className="w-28 h-28 bg-panel rounded-full flex items-center justify-center shadow-inner">
                    <SearchX className="w-16 h-16 text-primary animate-bounce-in" strokeWidth={1.5} />
                  </div>
                </div>
                
                {/* Badge de notification "404" */}
                <div className="absolute -top-2 -right-2 bg-error text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-bounce-in badge-pulse">
                  404
                </div>
                
                {/* Points de frappe animés en bas */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 typing-dots">
                  <span className="typing-dot bg-text-subtle"></span>
                  <span className="typing-dot bg-text-subtle"></span>
                  <span className="typing-dot bg-text-subtle"></span>
                </div>
              </div>
            </div>

            {/* Titre avec animation séquentielle */}
            <div className="text-center mb-8 space-y-3">
              <h1 className="text-5xl sm:text-6xl font-bold text-text-main animate-slide-up tracking-tight">
                Oups !
              </h1>
              <h2 className="text-xl sm:text-2xl font-semibold text-text-main animate-slide-up" style={{ animationDelay: '100ms' }}>
                Message introuvable
              </h2>
              <div className="flex items-center justify-center gap-2 text-text-subtle animate-fade-in" style={{ animationDelay: '200ms' }}>
                <MessageCircle className="w-4 h-4" />
                <p className="text-sm">Cette conversation n'existe pas</p>
              </div>
            </div>

            {/* Message explicatif avec style WhatsApp */}
            <div className="mb-8 animate-slide-up" style={{ animationDelay: '300ms' }}>
              <div className="message-bubble message-bubble-in inline-block">
                <p className="text-sm sm:text-base text-text-main leading-relaxed">
                  Il semblerait que cette page ait été supprimée, déplacée ou n'ait jamais existé. 
                  Pas d'inquiétude, retournons en terrain connu ! 🚀
                </p>
                <div className="flex items-center justify-end gap-1 mt-2 text-xs text-text-subtle">
                  <span>{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  {/* Double check WhatsApp */}
                  <svg className="w-4 h-4 text-primary checkmark-animate" viewBox="0 0 16 15" fill="none">
                    <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.033l-.358-.325a.32.32 0 0 0-.484.032l-.378.43a.32.32 0 0 0 .032.484l1.164 1.055a.32.32 0 0 0 .484-.033l6.272-8.048a.365.365 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" fill="currentColor"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Boutons d'action avec hover effects */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 animate-slide-up" style={{ animationDelay: '400ms' }}>
              <Link 
                href="/" 
                className="btn-primary flex items-center justify-center gap-2 group flex-1 ripple"
              >
                <Home className="w-5 h-5 transition-transform group-hover:scale-110" />
                <span>Retour à l'accueil</span>
              </Link>
              
              <button 
                onClick={() => window.history.back()} 
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-full border-2 border-border-main text-text-main hover:border-primary hover:bg-primary/5 transition-all flex-1 font-medium group ripple"
              >
                <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                <span>Page précédente</span>
              </button>
            </div>

            {/* Action secondaire - Rafraîchir */}
            <div className="mt-6 text-center animate-fade-in" style={{ animationDelay: '500ms' }}>
              <button 
                onClick={() => window.location.reload()} 
                className="text-sm text-text-subtle hover:text-primary transition-colors inline-flex items-center gap-2 group"
              >
                <RefreshCw className="w-4 h-4 transition-transform group-hover:rotate-180" />
                <span>Rafraîchir la page</span>
              </button>
            </div>

          </div>

          {/* Suggestions de liens utiles */}
          <div className="mt-6 text-center animate-slide-up" style={{ animationDelay: '600ms' }}>
            <p className="text-sm text-text-subtle mb-3">Pages les plus visitées :</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { label: 'Accueil', href: '/' },
                { label: 'Discussions', href: '/chats' },
                { label: 'Profil', href: '/profile' },
                { label: 'Paramètres', href: '/settings' },
              ].map((link, index) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs px-4 py-2 rounded-full bg-panel border border-border-main hover:border-primary hover:bg-primary/5 text-text-main transition-all hover-lift"
                  style={{ animationDelay: `${700 + index * 50}ms` }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* Footer amélioré */}
      <footer className="py-6 text-center text-sm text-text-subtle border-t border-border-main bg-panel animate-fade-in">
        <div className="space-y-1">
          <p className="font-medium">© {new Date().getFullYear()} MyZapp</p>
          <p className="text-xs opacity-75">Erreur 404 - Page introuvable</p>
        </div>
      </footer>
    </div>
  );
}