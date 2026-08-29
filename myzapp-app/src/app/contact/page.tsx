"use client";

import { useState } from "react";
import { Mail, MessageCircle, Send, CheckCircle2, Phone, MapPin } from "lucide-react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 5000);
    setName("");
    setEmail("");
    setMessage("");
  };

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
      <div className="text-center max-w-2xl mx-auto">
        <span className="text-xs font-black tracking-widest text-[#00FFA2] uppercase">Support & Assistance</span>
        <h1 className="text-3xl sm:text-5xl font-black text-white mt-2 mb-4">
          Contactez l'Équipe MyZapp
        </h1>
        <p className="text-sm text-slate-400">
          Une question sur votre bot ? Besoin d'une intégration sur-mesure pour votre entreprise ? Nous sommes là 7j/7.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Contact Info Cards */}
        <div className="space-y-4">
          <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-[#00FFA2]">
              <Mail size={20} />
            </div>
            <h3 className="text-sm font-bold text-white">Email Officiel</h3>
            <a
              href="mailto:contact@myzapp.com"
              className="text-xs text-emerald-400 hover:underline block"
            >
              contact@myzapp.com
            </a>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-[#00FFA2]">
              <MessageCircle size={20} />
            </div>
            <h3 className="text-sm font-bold text-white">Support WhatsApp</h3>
            <p className="text-xs text-slate-400">Assistance prioritaire en direct pour les membres Pro & VIP.</p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="md:col-span-2 glass-card p-6 sm:p-8 rounded-3xl border border-white/10">
          {sent ? (
            <div className="text-center py-12 space-y-3">
              <CheckCircle2 size={48} className="text-[#00FFA2] mx-auto" />
              <h3 className="text-lg font-bold text-white">Message Envoyé !</h3>
              <p className="text-xs text-slate-400">Notre équipe technique vous répondra dans les plus brefs délais.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Votre Nom</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jean Koffi"
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#00D06C]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Votre Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jean@exemple.com"
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#00D06C]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Votre Message</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Décrivez votre besoin ou votre question..."
                  className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#00D06C] resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl btn-myzapp text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
              >
                <span>Envoyer le Message</span>
                <Send size={14} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
