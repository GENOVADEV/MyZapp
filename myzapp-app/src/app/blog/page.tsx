import Link from "next/link";
import { Sparkles, Calendar, ArrowRight } from "lucide-react";

export default function BlogPage() {
  const POSTS = [
    {
      title: "Comment éviter le bannissement WhatsApp en 2026 lors de vos diffusions",
      date: "28 Août 2026",
      category: "Marketing & Sécurité",
      excerpt: "Les algorithmes anti-spam de Meta sont devenus impitoyables. Découvrez pourquoi les pauses automatiques de 15 minutes sont la seule méthode viable pour prospecter en toute sécurité.",
      readTime: "4 min de lecture"
    },
    {
      title: "5 techniques pour convertir vos prospects WhatsApp en clients grâce à l'IA",
      date: "25 Août 2026",
      category: "E-Commerce",
      excerpt: "De la réponse instantanée aux questions de stock à l'envoi de suggestions personnalisées, découvrez comment le Chatbot Gemini booste le panier moyen.",
      readTime: "5 min de lecture"
    },
    {
      title: "Pourquoi l'automatisation WhatsApp est le canal n°1 en Afrique",
      date: "20 Août 2026",
      category: "Analyse Marché",
      excerpt: "Avec un taux d'ouverture de plus de 98% contre moins de 20% pour les emails, WhatsApp est devenu le véritable système d'exploitation commercial en Afrique de l'Ouest et Centrale.",
      readTime: "3 min de lecture"
    }
  ];

  return (
    <div className="min-h-screen pt-6 sm:pt-12 pb-16 sm:pb-20 px-3 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 sm:space-y-12">
      <div className="text-center max-w-3xl mx-auto">
        <span className="text-xs font-black tracking-widest text-[#00FFA2] uppercase">Blog & Actualités</span>
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white mt-2 mb-3 sm:mb-4">
          Conseils & Stratégies WhatsApp
        </h1>
        <p className="text-sm text-slate-400">
          Les meilleures pratiques pour développer vos ventes et automatiser votre communication.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {POSTS.map((post, idx) => (
          <div key={idx} className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col justify-between hover:border-emerald-500/40 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="badge badge-xs bg-emerald-500/20 text-[#00FFA2] border-none text-[10px]">
                  {post.category}
                </span>
                <span>{post.readTime}</span>
              </div>
              <h2 className="text-base font-bold text-white leading-snug hover:text-[#00D06C] transition-colors">
                {post.title}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">{post.excerpt}</p>
            </div>

            <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
              <span>{post.date}</span>
              <span className="text-[#00FFA2] font-bold flex items-center gap-1 hover:underline">
                Lire <ArrowRight size={12} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
