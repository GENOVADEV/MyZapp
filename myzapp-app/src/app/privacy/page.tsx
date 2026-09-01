import { ShieldCheck, Lock, EyeOff } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pt-6 sm:pt-12 pb-16 sm:pb-20 px-3 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6 sm:space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <span className="text-xs font-black tracking-widest text-[#00FFA2] uppercase">Sécurité & RGPD</span>
        <h1 className="text-3xl sm:text-4xl font-black text-white mt-2 mb-3">
          Politique de Confidentialité
        </h1>
        <p className="text-xs text-slate-400">Dernière mise à jour : 28 Août 2026</p>
      </div>

      <div className="glass-card rounded-3xl p-6 sm:p-10 border border-white/10 space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed">
        <div className="space-y-3">
          <h2 className="text-base font-bold text-white">1. Protection de vos données de session WhatsApp</h2>
          <p>
            Chez <strong>MyZapp</strong>, la confidentialité de vos échanges est notre priorité absolue. Les clés de session générées (<code>RGNK~...</code>) sont exclusivement stockées dans une base de données sécurisée chiffrée de bout en bout et ne sont jamais partagées avec des tiers.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-bold text-white">2. Traitement des messages et Chatbot IA</h2>
          <p>
            Les messages traités par l'IA Gemini le sont de manière éphémère à des fins exclusives de génération de réponse en temps réel. Aucun journal de conversation privée n'est vendu, archivé ou exploité à des fins publicitaires.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-bold text-white">3. Droits d'accès et suppression</h2>
          <p>
            Vous disposez d'un droit permanent de suppression de votre compte et de toutes vos sessions en cliquant simplement sur <em>"Déconnecter"</em> ou en contactant notre délégué à la protection des données à <code>contact@myzapp.com</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
