"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Bot, 
  Zap, 
  Menu, 
  X, 
  ChevronRight, 
  ShieldCheck, 
  Sparkles, 
  Download, 
  ArrowRight,
  User,
  LayoutDashboard
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

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#060D1F]/90 backdrop-blur-xl border-b border-white/10 py-3.5 shadow-2xl"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00D06C] to-[#00FFA2] p-0.5 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-all">
              <div className="w-full h-full bg-[#060D1F] rounded-[14px] flex items-center justify-center p-1.5 overflow-hidden">
                <img src="/logo.svg" alt="MyZapp" className="w-full h-full object-contain" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-xl font-black text-white tracking-tight">
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

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/#fonctionnalites"
              className="text-sm font-medium text-slate-300 hover:text-[#00D06C] transition-colors"
            >
              Fonctionnalités
            </Link>
            <Link
              href="/#cas-dusage"
              className="text-sm font-medium text-slate-300 hover:text-[#00D06C] transition-colors"
            >
              Cas d'usage
            </Link>
            <Link
              href="/#tarifs"
              className="text-sm font-medium text-slate-300 hover:text-[#00D06C] transition-colors"
            >
              Tarifs
            </Link>
            <Link
              href="/docs"
              className="text-sm font-medium text-slate-300 hover:text-[#00D06C] transition-colors"
            >
              Documentation
            </Link>
            <Link
              href="/blog"
              className="text-sm font-medium text-slate-300 hover:text-[#00D06C] transition-colors"
            >
              Blog
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <Link
                href="/app"
                className="btn btn-sm btn-myzapp rounded-xl px-4 gap-2 text-xs"
              >
                <LayoutDashboard size={15} />
                <span>Mon Espace Bot</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/auth"
                  className="text-xs font-bold text-slate-300 hover:text-white px-3 py-2 rounded-xl transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  href="/auth?tab=register"
                  className="btn btn-sm btn-myzapp rounded-xl px-4 gap-1.5 text-xs shadow-lg"
                >
                  <span>Créer mon Bot</span>
                  <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {user && (
              <Link
                href="/app"
                className="btn btn-xs btn-myzapp rounded-lg text-[11px] px-2.5"
              >
                App
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="btn btn-square btn-ghost btn-sm text-slate-300 hover:text-white"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer / Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#060D1F]/98 border-b border-white/10 px-4 pt-4 pb-6 space-y-4 shadow-2xl backdrop-blur-2xl animate-fadeIn">
          <div className="flex flex-col space-y-3">
            <Link
              href="/#fonctionnalites"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold text-slate-200 py-2 border-b border-white/5 flex items-center justify-between"
            >
              <span>Fonctionnalités</span>
              <ChevronRight size={16} className="text-slate-500" />
            </Link>
            <Link
              href="/#cas-dusage"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold text-slate-200 py-2 border-b border-white/5 flex items-center justify-between"
            >
              <span>Cas d'usage</span>
              <ChevronRight size={16} className="text-slate-500" />
            </Link>
            <Link
              href="/#tarifs"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold text-slate-200 py-2 border-b border-white/5 flex items-center justify-between"
            >
              <span>Tarifs</span>
              <ChevronRight size={16} className="text-slate-500" />
            </Link>
            <Link
              href="/docs"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold text-slate-200 py-2 border-b border-white/5 flex items-center justify-between"
            >
              <span>Documentation</span>
              <ChevronRight size={16} className="text-slate-500" />
            </Link>
            <Link
              href="/tutorials"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold text-slate-200 py-2 border-b border-white/5 flex items-center justify-between"
            >
              <span>Tutoriels</span>
              <ChevronRight size={16} className="text-slate-500" />
            </Link>
            <Link
              href="/blog"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold text-slate-200 py-2 border-b border-white/5 flex items-center justify-between"
            >
              <span>Blog</span>
              <ChevronRight size={16} className="text-slate-500" />
            </Link>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            {user ? (
              <Link
                href="/app"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 rounded-xl btn-myzapp text-center font-bold text-sm flex items-center justify-center gap-2"
              >
                <LayoutDashboard size={16} />
                <span>Ouvrir l'Espace Bot</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/auth?tab=register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 rounded-xl btn-myzapp text-center font-bold text-sm flex items-center justify-center gap-2"
                >
                  <span>Créer mon compte Gratuitement</span>
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/auth"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 border border-white/10 text-center font-semibold text-sm text-slate-300"
                >
                  Se connecter
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
