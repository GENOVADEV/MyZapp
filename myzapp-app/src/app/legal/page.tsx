export default function LegalPage() {
  return (
    <div className="min-h-screen pt-6 sm:pt-12 pb-16 sm:pb-20 px-3 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6 sm:space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <span className="text-xs font-black tracking-widest text-[#00FFA2] uppercase">Informations Légales</span>
        <h1 className="text-3xl sm:text-4xl font-black text-white mt-2 mb-3">
          Mentions Légales
        </h1>
      </div>

      <div className="glass-card rounded-3xl p-6 sm:p-10 border border-white/10 space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed">
        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">Éditeur de la Plateforme</h2>
          <p>
            <strong>MyZapp Africa</strong><br />
            Email : <code>contact@myzapp.com</code><br />
            Support : Assistance en direct via l'espace bot WhatsApp.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">Hébergement</h2>
          <p>
            Infrastructure cloud sécurisée déployée sur Vercel Inc. et Render Cloud Services avec bases de données PostgreSQL chiffrées SSL.
          </p>
        </div>
      </div>
    </div>
  );
}
