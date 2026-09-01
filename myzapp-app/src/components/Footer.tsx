import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#030712] border-t border-white/10 pt-12 sm:pt-16 pb-10 sm:pb-12 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 lg:gap-12 mb-12">
          {/* Brand Col: full width on mobile, 2 cols on md */}
          <div className="col-span-2 sm:col-span-3 md:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00D06C] to-[#00FFA2] p-0.5 shadow-lg shadow-emerald-500/20">
                <div className="w-full h-full bg-[#060D1F] rounded-[14px] flex items-center justify-center p-1.5 overflow-hidden">
                  <img src="/logo.svg" alt="MyZapp" className="w-full h-full object-contain" />
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-black text-white tracking-tight">
                    My<span className="text-[#00D06C]">Zapp</span>
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  BOOSTEZ WHATSAPP
                </span>
              </div>
            </Link>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              La plateforme d'automatisation et d'intelligence artificielle pour WhatsApp la plus puissante. Chatbot Gemini, diffusion marketing anti-ban, CRM et téléchargements médias 4K.
            </p>

            <div className="pt-1 flex items-center gap-3">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-semibold text-[#00FFA2]">
                <span className="w-2 h-2 rounded-full bg-[#00FFA2] animate-pulse" />
                <span>Moteur Raganork v6.2 Actif</span>
              </div>
            </div>
          </div>

          {/* Produit */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Produit</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/#fonctionnalites" className="hover:text-[#00D06C] transition-colors py-0.5 inline-block">
                  Fonctionnalités
                </Link>
              </li>
              <li>
                <Link href="/#tarifs" className="hover:text-[#00D06C] transition-colors py-0.5 inline-block">
                  Tarifs
                </Link>
              </li>
              <li>
                <Link href="/#cas-dusage" className="hover:text-[#00D06C] transition-colors py-0.5 inline-block">
                  Cas d'usage
                </Link>
              </li>
              <li>
                <Link href="/auth?tab=register" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors py-0.5 inline-block">
                  Créer un compte
                </Link>
              </li>
            </ul>
          </div>

          {/* Ressources */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Ressources</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/docs" className="hover:text-[#00D06C] transition-colors py-0.5 inline-block">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/tutorials" className="hover:text-[#00D06C] transition-colors py-0.5 inline-block">
                  Tutoriels pas à pas
                </Link>
              </li>
              <li>
                <Link href="/api-docs" className="hover:text-[#00D06C] transition-colors py-0.5 inline-block">
                  API & Webhooks
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-[#00D06C] transition-colors py-0.5 inline-block">
                  Blog & Astuces
                </Link>
              </li>
            </ul>
          </div>

          {/* Légal & Contact */}
          <div className="space-y-3 col-span-2 sm:col-span-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Légal & Contact</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/privacy" className="hover:text-[#00D06C] transition-colors py-0.5 inline-block">
                  Confidentialité
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#00D06C] transition-colors py-0.5 inline-block">
                  Conditions (CGU)
                </Link>
              </li>
              <li>
                <Link href="/legal" className="hover:text-[#00D06C] transition-colors py-0.5 inline-block">
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#00D06C] transition-colors py-0.5 inline-block">
                  Support & Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center sm:text-left">
          <p>© {new Date().getFullYear()} MyZapp. Tous droits réservés.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-400">
              <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
              Cryptage SSL 256-bit
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
