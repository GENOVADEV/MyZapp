// src/components/layout/Footer.tsx
import Link from "next/link";
import { BotMessageSquare, ArrowRight, Github, Twitter, Linkedin, Mail, Sparkles } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-panel border-t border-border-main flex flex-col items-center">
      
      {/* --- 1. SECTION CALL-TO-ACTION (Le "Push" Final) --- */}
      <div className="w-full max-w-7xl mx-auto px-6 lg:px-8 -mt-16 mb-12 relative z-10">
        <div className="bg-background-app border border-border-main rounded-3xl p-8 md:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden relative">
          
          {/* Décoration d'arrière-plan du CTA */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
          
          <div className="max-w-xl z-10 text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-bold text-text-main mb-3 flex items-center justify-center md:justify-start gap-2">
              <Sparkles className="w-6 h-6 text-accent" />
              Prêt à transformer votre WhatsApp ?
            </h2>
            <p className="text-text-subtle text-lg">
              Rejoignez les professionnels qui automatisent leur communication et ne perdent plus aucune opportunité. Configuration en 2 minutes.
            </p>
          </div>
          
          <div className="z-10 flex-shrink-0 w-full md:w-auto">
            <Link href="/register" className="btn-primary w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 text-lg hover-lift shadow-lg shadow-primary/20">
              Démarrer gratuitement
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* --- 2. SECTION NAVIGATION ET LIENS --- */}
      <div className="w-full max-w-7xl mx-auto px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">
        
        {/* Colonne Marque */}
        <div className="lg:col-span-2 flex flex-col items-start">
          <Link href="/" className="flex items-center gap-2 hover-lift mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white shadow-inner">
              <BotMessageSquare className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <span className="text-2xl font-bold tracking-tight text-text-main">MyZapp</span>
          </Link>
          <p className="text-text-subtle mb-6 max-w-sm leading-relaxed">
            L'assistant intelligent qui gère votre messagerie pendant que vous vous concentrez sur l'essentiel. Sécurisé, rapide et 100% personnalisable.
          </p>
          {/* Réseaux Sociaux */}
          <div className="flex items-center gap-4">
            <a href="#" className="w-10 h-10 rounded-full bg-background-app border border-border-main flex items-center justify-center text-text-subtle hover:text-primary hover:border-primary transition-colors hover-lift" aria-label="Twitter">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-background-app border border-border-main flex items-center justify-center text-text-subtle hover:text-primary hover:border-primary transition-colors hover-lift" aria-label="LinkedIn">
              <Linkedin className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-background-app border border-border-main flex items-center justify-center text-text-subtle hover:text-primary hover:border-primary transition-colors hover-lift" aria-label="GitHub">
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Colonnes Liens */}
        <div>
          <h3 className="font-bold text-text-main mb-4 tracking-wide">Produit</h3>
          <ul className="space-y-3">
            <li><Link href="#fonctionnalites" className="text-text-subtle hover:text-primary transition-colors">Fonctionnalités</Link></li>
            <li><Link href="#tarifs" className="text-text-subtle hover:text-primary transition-colors">Tarifs</Link></li>
            <li><Link href="#" className="text-text-subtle hover:text-primary transition-colors">Cas d'usage</Link></li>
            <li><Link href="#" className="text-text-subtle hover:text-primary transition-colors">Mises à jour</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-bold text-text-main mb-4 tracking-wide">Ressources</h3>
          <ul className="space-y-3">
            <li><Link href="#" className="text-text-subtle hover:text-primary transition-colors">Documentation</Link></li>
            <li><Link href="#" className="text-text-subtle hover:text-primary transition-colors">API Node.js</Link></li>
            <li><Link href="#" className="text-text-subtle hover:text-primary transition-colors">Tutoriels</Link></li>
            <li><Link href="#" className="text-text-subtle hover:text-primary transition-colors">Blog</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-bold text-text-main mb-4 tracking-wide">Légal</h3>
          <ul className="space-y-3">
            <li><Link href="#" className="text-text-subtle hover:text-primary transition-colors">Confidentialité</Link></li>
            <li><Link href="#" className="text-text-subtle hover:text-primary transition-colors">CGU</Link></li>
            <li><Link href="#" className="text-text-subtle hover:text-primary transition-colors">Mentions légales</Link></li>
            <li><a href="mailto:contact@myzapp.com" className="text-text-subtle hover:text-primary transition-colors flex items-center gap-2"><Mail className="w-4 h-4"/> Contact</a></li>
          </ul>
        </div>

      </div>

      {/* --- 3. SECTION COPYRIGHT --- */}
      <div className="w-full border-t border-border-main">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-text-muted text-center md:text-left">
            © {currentYear} MyZapp. Tous droits réservés. Fait avec passion pour la productivité.
          </p>
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <span className="w-2 h-2 rounded-full bg-online animate-pulse"></span>
            Systèmes opérationnels
          </div>
        </div>
      </div>
    </footer>
  );
}