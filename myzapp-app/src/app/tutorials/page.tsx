import Link from "next/link";
import { Play, QrCode, Phone, Send, Bot, ArrowRight, CheckCircle2 } from "lucide-react";

export default function TutorialsPage() {
  const TUTORIALS = [
    {
      title: "Comment connecter votre compte WhatsApp en 1 minute",
      desc: "Apprenez à utiliser le QR Code ou le code d'appairage par numéro de téléphone pour lier votre bot en toute sécurité.",
      duration: "2 min",
      tag: "Débutant",
      steps: [
        "Rendez-vous dans votre espace /app après inscription.",
        "Cliquez sur 'Connecter WhatsApp' puis choisissez 'Scanner QR Code' ou 'Code par Téléphone'.",
        "Ouvrez WhatsApp sur votre smartphone > Appareils connectés > Connecter un appareil.",
        "Copiez le code RGNK~ généré et collez-le dans le champ pour démarrer votre bot !"
      ]
    },
    {
      title: "Maîtriser la diffusion marketing anti-ban Business",
      desc: "Découvrez comment envoyer vos messages à plus de 500 contacts sans jamais vous faire bloquer grâce aux pauses de 15 minutes.",
      duration: "3 min",
      tag: "Marketing",
      steps: [
        "Tapez la commande .diffuse business <votre message>",
        "Le bot envoie automatiquement par groupes de 15 contacts.",
        "Une pause sécurisée de 15 à 20 minutes s'enclenche automatiquement.",
        "Votre réputation d'expéditeur reste 100% propre auprès de WhatsApp."
      ]
    },
    {
      title: "Configurer l'IA Gemini pour répondre à vos clients",
      desc: "Personnalisez la personnalité de votre assistant virtuel et activez les réponses automatiques sur votre boutique.",
      duration: "4 min",
      tag: "Intelligence Artificielle",
      steps: [
        "Activez l'interrupteur 'IA Gemini' dans votre tableau de bord.",
        "Testez les réponses dans une discussion privée en envoyant .ai <votre question>.",
        "Définissez vos filtres de prix et catalogues avec .filter prix = nos tarifs..."
      ]
    }
  ];

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-12">
      <div className="text-center max-w-3xl mx-auto">
        <span className="text-xs font-black tracking-widest text-[#00D06C] uppercase">Tutoriels Pas à Pas</span>
        <h1 className="text-3xl sm:text-5xl font-black text-white mt-2 mb-4">
          Guides & Astuces MyZapp
        </h1>
        <p className="text-sm text-slate-400">
          Suivez nos guides simplifiés pour exploiter 100% de la puissance de votre Bot WhatsApp.
        </p>
      </div>

      <div className="space-y-8">
        {TUTORIALS.map((t, idx) => (
          <div key={idx} className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4">
              <div>
                <span className="badge badge-xs bg-emerald-500/20 text-[#00FFA2] border-none text-[10px] font-bold uppercase mb-1">
                  {t.tag} • {t.duration}
                </span>
                <h2 className="text-xl font-bold text-white">{t.title}</h2>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300">{t.desc}</p>

            <div className="bg-slate-900/80 p-5 rounded-2xl border border-white/5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Étapes à suivre :</h4>
              <ol className="space-y-2 text-xs text-slate-300 list-decimal list-inside">
                {t.steps.map((step, sIdx) => (
                  <li key={sIdx} className="leading-relaxed">
                    <span className="text-white font-medium">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
