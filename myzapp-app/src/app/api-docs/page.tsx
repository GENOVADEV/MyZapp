import { Terminal, Code, Cpu, ShieldCheck } from "lucide-react";

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen pt-6 sm:pt-12 pb-16 sm:pb-20 px-3 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 sm:space-y-10">
      <div className="text-center max-w-3xl mx-auto">
        <span className="text-xs font-black tracking-widest text-[#00FFA2] uppercase">Développeurs & Intégrations</span>
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white mt-2 mb-3 sm:mb-4">
          API Node.js & Webhooks MyZapp
        </h1>
        <p className="text-sm text-slate-400">
          Intégrez la puissance du bot MyZapp directement dans vos applications, CRMs et boutiques en ligne.
        </p>
      </div>

      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 space-y-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Terminal size={20} className="text-[#00D06C]" />
          <span>Authentification & Headers</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-300">
          Toutes les requêtes vers l'API MyZapp nécessitent un Bearer Token JWT transmis dans l'en-tête <code>Authorization</code> :
        </p>
        <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-emerald-400 border border-white/5 overflow-x-auto">
{`Authorization: Bearer VOTRE_JWT_TOKEN_MYZAPP
Content-Type: application/json`}
        </pre>
      </div>

      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 space-y-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Code size={20} className="text-sky-400" />
          <span>Endpoints Principaux</span>
        </h2>

        <div className="space-y-4 text-xs">
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="badge badge-success badge-sm font-mono text-[10px]">POST</span>
              <code className="text-white font-mono">/api/bot/connect</code>
            </div>
            <p className="text-slate-300">Connecte une nouvelle chaîne de session <code>RGNK~...</code> au bot.</p>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="badge badge-info badge-sm font-mono text-[10px]">GET</span>
              <code className="text-white font-mono">/api/bot/session</code>
            </div>
            <p className="text-slate-300">Récupère le statut de connexion WhatsApp, l'uptime et les statistiques du bot.</p>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="badge badge-error badge-sm font-mono text-[10px]">POST</span>
              <code className="text-white font-mono">/api/bot/disconnect</code>
            </div>
            <p className="text-slate-300">Déconnecte et supprime la session active en toute sécurité.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
