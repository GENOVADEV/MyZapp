"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Menu, 
  X, 
  ChevronRight, 
  ArrowRight,
  LayoutDashboard,
  BookOpen,
  Sparkles,
  Zap,
  HelpCircle,
  Newspaper
} from "lucide-react";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);

    // Check auth
    const token = localStorage.getItem("myzapp_token");
    const storedUser = localStorage.getItem("myzapp_user");
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {}
    }

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#060D1F]/95 backdrop-blur-xl border-b border-white/10 shadow-2xl py-1 sm:py-2"
          : "bg-[#060D1F]/80 backdrop-blur-lg border-b border-white/5 py-2 sm:py-3"
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="navbar min-h-12 p-0 justify-between">
          {/* Navbar Start: Logo & Brand */}
          <div className="navbar-start w-auto">
            <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-[#00D06C] to-[#00FFA2] p-0.5 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-all">
                <div className="w-full h-full bg-[#060D1F] rounded-[14px] flex items-center justify-center p-1.5 overflow-hidden">
                  <img src="/logo.svg" alt="MyZapp" className="w-full h-full object-contain" />
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg sm:text-xl font-black text-white tracking-tight">
                    My<span className="text-[#00D06C]">Zapp</span>
                  </span>
                  <span className="badge badge-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] font-bold">
                    v6.2
                  </span>
                </div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider hidden sm:block">
                  Boostez WhatsApp
                </span>
              </div>
            </Link>
          </div>

          {/* Navbar Center: Desktop Navigation */}
          <div className="navbar-center hidden lg:flex">
            <ul className="menu menu-horizontal px-1 gap-1">
              <li>
                <Link
                  href="/#fonctionnalites"
                  className="text-xs font-semibold text-slate-300 hover:text-[#00D06C] hover:bg-white/5 rounded-xl transition-colors py-2 px-3"
                >
                  Fonctionnalités
                </Link>
              </li>
              <li>
                <Link
                  href="/#cas-dusage"
                  className="text-xs font-semibold text-slate-300 hover:text-[#00D06C] hover:bg-white/5 rounded-xl transition-colors py-2 px-3"
                >
                  Cas d'usage
                </Link>
              </li>
              <li>
                <Link
                  href="/#tarifs"
                  className="text-xs font-semibold text-slate-300 hover:text-[#00D06C] hover:bg-white/5 rounded-xl transition-colors py-2 px-3"
                >
                  Tarifs
                </Link>
              </li>
              <li>
                <Link
                  href="/docs"
                  className="text-xs font-semibold text-slate-300 hover:text-[#00D06C] hover:bg-white/5 rounded-xl transition-colors py-2 px-3"
                >
                  Docs
                </Link>
              </li>
              <li>
                <Link
                  href="/tutorials"
                  className="text-xs font-semibold text-slate-300 hover:text-[#00D06C] hover:bg-white/5 rounded-xl transition-colors py-2 px-3"
                >
                  Tutoriels
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-xs font-semibold text-slate-300 hover:text-[#00D06C] hover:bg-white/5 rounded-xl transition-colors py-2 px-3"
                >
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Navbar End: Action CTAs + Mobile Burger */}
          <div className="navbar-end w-auto flex items-center gap-2">
            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-2">
              {user ? (
                <Link
                  href="/app"
                  className="btn btn-sm btn-myzapp rounded-xl px-4 gap-1.5 text-xs shadow-md shadow-emerald-500/20"
                >
                  <LayoutDashboard size={14} />
                  <span>Mon Espace Bot</span>
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth"
                    className="btn btn-ghost btn-sm text-xs font-bold text-slate-300 hover:text-white rounded-xl"
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/auth?tab=register"
                    className="btn btn-sm btn-myzapp rounded-xl px-4 gap-1.5 text-xs shadow-lg shadow-emerald-500/20"
                  >
                    <span>Créer mon Bot</span>
                    <ArrowRight size={13} />
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Actions: Compact CTA + Burger Toggle */}
            <div className="flex sm:hidden items-center gap-1.5">
              {user ? (
                <Link
                  href="/app"
                  className="btn btn-xs btn-myzapp rounded-lg text-[11px] px-2.5 font-bold"
                >
                  Studio
                </Link>
              ) : (
                <Link
                  href="/auth"
                  className="btn btn-xs btn-outline border-emerald-500/40 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 rounded-lg text-[11px] px-2"
                >
                  Connexion
                </Link>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="btn btn-square btn-ghost btn-sm text-slate-200 hover:text-white rounded-xl"
                aria-label="Menu de navigation"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer / Full-width overlay with backdrop */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="absolute top-full left-0 right-0 z-50 bg-[#060D1F]/98 border-b border-white/10 px-4 pt-4 pb-6 shadow-2xl backdrop-blur-2xl lg:hidden max-h-[calc(100vh-4.5rem)] overflow-y-auto space-y-4 animate-fadeIn">
            <ul className="menu menu-vertical p-0 space-y-1">
              <li>
                <Link
                  href="/#fonctionnalites"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-semibold text-slate-200 py-3 rounded-xl hover:bg-white/5 active:bg-emerald-500/20 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2.5">
                    <Sparkles size={16} className="text-[#00FFA2]" />
                    Fonctionnalités
                  </span>
                  <ChevronRight size={16} className="text-slate-500" />
                </Link>
              </li>
              <li>
                <Link
                  href="/#cas-dusage"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-semibold text-slate-200 py-3 rounded-xl hover:bg-white/5 active:bg-emerald-500/20 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2.5">
                    <Zap size={16} className="text-[#00FFA2]" />
                    Cas d'usage
                  </span>
                  <ChevronRight size={16} className="text-slate-500" />
                </Link>
              </li>
              <li>
                <Link
                  href="/#tarifs"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-semibold text-slate-200 py-3 rounded-xl hover:bg-white/5 active:bg-emerald-500/20 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-emerald-400 font-bold text-sm">FCFA</span>
                    Tarifs & Offres
                  </span>
                  <ChevronRight size={16} className="text-slate-500" />
                </Link>
              </li>
              <li>
                <Link
                  href="/docs"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-semibold text-slate-200 py-3 rounded-xl hover:bg-white/5 active:bg-emerald-500/20 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2.5">
                    <BookOpen size={16} className="text-[#00FFA2]" />
                    Documentation & Commandes
                  </span>
                  <ChevronRight size={16} className="text-slate-500" />
                </Link>
              </li>
              <li>
                <Link
                  href="/tutorials"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-semibold text-slate-200 py-3 rounded-xl hover:bg-white/5 active:bg-emerald-500/20 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2.5">
                    <HelpCircle size={16} className="text-[#00FFA2]" />
                    Tutoriels Pas à Pas
                  </span>
                  <ChevronRight size={16} className="text-slate-500" />
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-semibold text-slate-200 py-3 rounded-xl hover:bg-white/5 active:bg-emerald-500/20 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2.5">
                    <Newspaper size={16} className="text-[#00FFA2]" />
                    Blog & Stratégies
                  </span>
                  <ChevronRight size={16} className="text-slate-500" />
                </Link>
              </li>
            </ul>

            <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
              {user ? (
                <Link
                  href="/app"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn btn-myzapp w-full rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
                >
                  <LayoutDashboard size={16} />
                  <span>Accéder à Mon Espace Bot</span>
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth?tab=register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn btn-myzapp w-full rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
                  >
                    <span>Créer mon Bot Gratuitement</span>
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    href="/auth"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn btn-outline border-white/20 text-slate-200 hover:bg-white/5 w-full rounded-xl font-semibold text-sm"
                  >
                    Connexion
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
