// src/components/sections/Hero.tsx
import Link from "next/link";
import { BotMessageSquare, ArrowRight, Sparkles, ShieldCheck, Zap } from "lucide-react";

export default function WelcomeHero() {
  return (
    <section className="relative w-full overflow-hidden bg-background-app py-20 md:py-32 flex items-center justify-center">

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none opacity-50">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse-typing"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[128px] animate-pulse-typing" style={{ animationDelay: '1s'}}></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-8 items-center text-center lg:text-left">

          {/* LEFT */}
          <div className="lg:col-span-3 flex flex-col items-center lg:items-start space-y-8 animate-slide-up">

            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-panel text-primary border border-border-main shadow-sm">
              <Sparkles className="w-5 h-5 text-accent animate-spin" style={{ animationDuration: '4s' }} />
              <span className="text-base font-semibold tracking-wide">
                Automatisez et boostez votre WhatsApp
              </span>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-text-main leading-[1.05]">
              Transformez votre <br />
              <span className="text-primary relative inline-block">
                WhatsApp en machine intelligente
                <span className="absolute -bottom-2 left-0 w-full h-1.5 bg-accent rounded-full"></span>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-text-subtle max-w-2xl leading-relaxed">
              Répondez automatiquement, gagnez du temps et améliorez vos échanges.
              <br className="hidden md:block" />
              <span className="text-text-main font-semibold">
                Connectez-vous en moins de 10 secondes.
              </span>
            </p>

            {/* Trust indicators */}
            <div className="flex items-center gap-4 text-sm text-text-subtle">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                100% sécurisé
              </div>
              <div>•</div>
              <div>Aucune compétence technique requise</div>
            </div>

            {/* CTA */}
            <div className="pt-6 flex flex-col sm:flex-row gap-4">
              <Link
                href="/dashboard"
                className="btn-primary flex items-center justify-center gap-3 text-xl px-10 py-5 hover-lift ripple"
              >
                <Zap className="w-6 h-6" /> Connecter mon WhatsApp
                <ArrowRight className="w-6 h-6" />
              </Link>

              <Link
                href="/demo"
                className="px-8 py-5 rounded-xl border border-border-main text-text-main hover:bg-panel transition"
              >
                Voir une démo
              </Link>
            </div>

            {/* Micro proof */}
            <p className="text-sm text-text-subtle">
              +2 000 utilisateurs actifs • Disponible 24h/24
            </p>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-2 flex justify-center lg:justify-end">
            <div className="relative group">

              <div className="absolute inset-0 bg-primary/30 rounded-[2.5rem] blur-2xl transition-smooth group-hover:scale-110"></div>

              <div className="relative panel-card w-64 h-64 md:w-80 md:h-80 rounded-[2.5rem] border border-border-main flex items-center justify-center shadow-2xl hover:-translate-y-2 overflow-hidden">

                <div className="absolute inset-0 opacity-[0.03] bg-background-chat"></div>

                <BotMessageSquare
                  className="w-32 h-32 md:w-40 md:h-40 text-primary"
                  strokeWidth={1}
                />

                {/* Status */}
                <div className="absolute bottom-6 right-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                  </span>
                  <span className="text-xs font-bold text-green-500 tracking-wider">
                    EN LIGNE
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}