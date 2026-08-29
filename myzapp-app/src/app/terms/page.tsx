export default function TermsPage() {
  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <span className="text-xs font-black tracking-widest text-[#00FFA2] uppercase">Cadre Légal</span>
        <h1 className="text-3xl sm:text-4xl font-black text-white mt-2 mb-3">
          Conditions Générales d'Utilisation (CGU)
        </h1>
        <p className="text-xs text-slate-400">Dernière mise à jour : 28 Août 2026</p>
      </div>

      <div className="glass-card rounded-3xl p-6 sm:p-10 border border-white/10 space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed">
        <div className="space-y-3">
          <h2 className="text-base font-bold text-white">1. Objet du Service</h2>
          <p>
            MyZapp fournit un service logiciel d'automatisation et de bot conversationnel pour WhatsApp basé sur le moteur open source Raganork v6.2.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-bold text-white">2. Responsabilité de l'utilisateur</h2>
          <p>
            L'utilisateur s'engage à utiliser le service dans le respect des conditions de service de WhatsApp et des lois en vigueur. Tout usage abusif (envoi de spam massif non consenti, harcèlement ou usurpation d'identité) entraînera la résiliation immédiate du compte.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-bold text-white">3. Disponibilité</h2>
          <p>
            Bien que nous mettions en œuvre tous les moyens pour garantir une disponibilité de 99.9%, MyZapp ne saurait être tenu responsable des pannes ou restrictions imposées directement par les infrastructures réseau de WhatsApp/Meta.
          </p>
        </div>
      </div>
    </div>
  );
}
