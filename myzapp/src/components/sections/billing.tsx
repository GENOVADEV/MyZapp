// src/components/billing.tsx
"use client";

import { useState } from 'react';
import { 
  Check, 
  X, 
  Sparkles, 
  Zap, 
  Crown, 
  Rocket,
  Users,
  MessageCircle,
  Shield,
  BarChart3,
  Headphones,
  Globe,
  ChevronRight,
  Star,
  TrendingUp,
  Award,
  Gift
} from 'lucide-react';

// Types
interface Plan {
  id: string;
  name: string;
  tagline: string;
  price: number;
  originalPrice?: number;
  period: string;
  icon: React.ReactNode;
  popular?: boolean;
  badge?: string;
  color: {
    primary: string;
    gradient: string;
    bg: string;
    border: string;
  };
  features: {
    category: string;
    items: {
      name: string;
      included: boolean;
      highlight?: boolean;
      value?: string;
    }[];
  }[];
  cta: string;
  savings?: string;
}

// Configuration des forfaits
const plans: Plan[] = [
  {
    id: 'young',
    name: 'MyZapp Young',
    tagline: 'Pour les étudiants et jeunes actifs',
    price: 2.99,
    originalPrice: 4.99,
    period: '/mois',
    icon: <Sparkles className="w-6 h-6" />,
    badge: '🎓 Étudiant',
    color: {
      primary: 'text-blue-500',
      gradient: 'from-blue-500 to-cyan-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30'
    },
    savings: '40% de réduction',
    features: [
      {
        category: 'Messages & Communication',
        items: [
          { name: 'Messages illimités', included: true },
          { name: 'Traduction automatique (3 langues)', included: true, value: '3' },
          { name: 'Transcription audio', included: true, highlight: true },
          { name: 'Programmer 5 messages/jour', included: true, value: '5' },
          { name: 'Réactions personnalisées', included: true },
          { name: 'Modifier messages (15 min)', included: true, value: '15 min' }
        ]
      },
      {
        category: 'Confidentialité',
        items: [
          { name: 'Mode invisible basique', included: true },
          { name: 'Messages auto-destructibles', included: true },
          { name: 'Verrouillage par PIN', included: true },
          { name: 'Masquer "en train d\'écrire"', included: false }
        ]
      },
      {
        category: 'Médias',
        items: [
          { name: 'Fichiers jusqu\'à 500 MB', included: true, value: '500 MB' },
          { name: 'Photos HD', included: true },
          { name: 'Éditeur photo basique', included: true },
          { name: 'Qualité vidéo 1080p', included: false }
        ]
      },
      {
        category: 'Support',
        items: [
          { name: 'Support par email', included: true },
          { name: 'Documentation complète', included: true },
          { name: 'Support prioritaire', included: false }
        ]
      }
    ],
    cta: 'Commencer gratuitement'
  },
  {
    id: 'agent',
    name: 'MyZapp Agent',
    tagline: 'Pour les professionnels indépendants',
    price: 9.99,
    period: '/mois',
    icon: <Zap className="w-6 h-6" />,
    popular: true,
    badge: '⚡ Plus populaire',
    color: {
      primary: 'text-primary',
      gradient: 'from-primary to-accent',
      bg: 'bg-primary/10',
      border: 'border-primary'
    },
    features: [
      {
        category: 'Messages & Communication',
        items: [
          { name: 'Messages illimités', included: true },
          { name: 'Traduction automatique (illimitée)', included: true, highlight: true },
          { name: 'Transcription audio automatique', included: true, highlight: true },
          { name: 'Programmer messages illimités', included: true, highlight: true },
          { name: 'Réactions personnalisées avancées', included: true },
          { name: 'Modifier messages sans limite', included: true, highlight: true },
          { name: 'Dossiers de chats personnalisés', included: true }
        ]
      },
      {
        category: 'Confidentialité',
        items: [
          { name: 'Mode invisible complet', included: true, highlight: true },
          { name: 'Messages auto-destructibles avancés', included: true },
          { name: 'Verrouillage biométrique', included: true },
          { name: 'Masquer toute activité', included: true },
          { name: 'Chats verrouillés multiples', included: true }
        ]
      },
      {
        category: 'Médias',
        items: [
          { name: 'Fichiers jusqu\'à 2 GB', included: true, value: '2 GB', highlight: true },
          { name: 'Photos & vidéos qualité originale', included: true },
          { name: 'Éditeur photo/vidéo Pro', included: true },
          { name: 'Qualité vidéo 4K', included: true },
          { name: 'Stockage cloud 50 GB', included: true, value: '50 GB' }
        ]
      },
      {
        category: 'Automatisation',
        items: [
          { name: 'Réponses automatiques', included: true },
          { name: '3 bots personnalisés', included: true, value: '3' },
          { name: 'Workflows basiques', included: true }
        ]
      },
      {
        category: 'Support',
        items: [
          { name: 'Support prioritaire 24/7', included: true, highlight: true },
          { name: 'Chat en direct', included: true },
          { name: 'Gestionnaire de compte dédié', included: false }
        ]
      }
    ],
    cta: 'Essayer 14 jours gratuits'
  },
  {
    id: 'business',
    name: 'MyZapp Business',
    tagline: 'Pour les équipes et petites entreprises',
    price: 24.99,
    period: '/mois',
    icon: <Users className="w-6 h-6" />,
    badge: '🏢 Entreprise',
    color: {
      primary: 'text-purple-500',
      gradient: 'from-purple-500 to-pink-500',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30'
    },
    features: [
      {
        category: 'Tout MyZapp Agent, plus :',
        items: [
          { name: 'Toutes les fonctionnalités Agent', included: true }
        ]
      },
      {
        category: 'Gestion d\'Équipe',
        items: [
          { name: 'Jusqu\'à 10 utilisateurs', included: true, value: '10', highlight: true },
          { name: 'Tableau de bord admin', included: true },
          { name: 'Statistiques d\'équipe avancées', included: true, highlight: true },
          { name: 'Gestion des rôles et permissions', included: true },
          { name: 'Onboarding personnalisé', included: true }
        ]
      },
      {
        category: 'Groupes Avancés',
        items: [
          { name: 'Groupes jusqu\'à 500 membres', included: true, value: '500' },
          { name: 'Sondages avancés illimités', included: true },
          { name: 'Modération automatique IA', included: true, highlight: true },
          { name: 'Statistiques groupe détaillées', included: true },
          { name: 'Sous-groupes et catégories', included: true }
        ]
      },
      {
        category: 'Appels & Réunions',
        items: [
          { name: 'Appels vidéo jusqu\'à 25 participants', included: true, value: '25' },
          { name: 'Enregistrement des appels', included: true },
          { name: 'Partage d\'écran avancé', included: true },
          { name: 'Filtres et arrière-plans Pro', included: true }
        ]
      },
      {
        category: 'Stockage & Médias',
        items: [
          { name: 'Fichiers jusqu\'à 5 GB', included: true, value: '5 GB', highlight: true },
          { name: 'Stockage cloud 500 GB', included: true, value: '500 GB', highlight: true },
          { name: 'Bibliothèque média partagée', included: true }
        ]
      },
      {
        category: 'Intégrations',
        items: [
          { name: 'API complète', included: true },
          { name: 'Webhooks personnalisés', included: true },
          { name: 'Intégrations CRM (5)', included: true, value: '5' },
          { name: 'SSO (Single Sign-On)', included: true }
        ]
      },
      {
        category: 'Support',
        items: [
          { name: 'Support Premium 24/7', included: true, highlight: true },
          { name: 'Gestionnaire de compte dédié', included: true },
          { name: 'Formation équipe incluse', included: true },
          { name: 'SLA 99.9% uptime', included: true }
        ]
      }
    ],
    cta: 'Démarrer l\'essai gratuit'
  },
  {
    id: 'pro',
    name: 'MyZapp Pro',
    tagline: 'Pour les grandes entreprises et organisations',
    price: 0,
    period: 'Sur mesure',
    icon: <Crown className="w-6 h-6" />,
    badge: '👑 Enterprise',
    color: {
      primary: 'text-amber-500',
      gradient: 'from-amber-500 to-orange-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30'
    },
    features: [
      {
        category: 'Tout MyZapp Business, plus :',
        items: [
          { name: 'Toutes les fonctionnalités Business', included: true }
        ]
      },
      {
        category: 'Enterprise',
        items: [
          { name: 'Utilisateurs illimités', included: true, highlight: true },
          { name: 'Infrastructure dédiée', included: true, highlight: true },
          { name: 'Déploiement on-premise disponible', included: true },
          { name: 'Personnalisation complète (white-label)', included: true },
          { name: 'Contrat SLA personnalisé', included: true }
        ]
      },
      {
        category: 'Sécurité & Conformité',
        items: [
          { name: 'Chiffrement de bout en bout renforcé', included: true },
          { name: 'Conformité RGPD, HIPAA, SOC2', included: true, highlight: true },
          { name: 'Audit de sécurité trimestriel', included: true },
          { name: 'Sauvegarde multi-région', included: true },
          { name: 'Récupération disaster recovery', included: true }
        ]
      },
      {
        category: 'Analyse & Reporting',
        items: [
          { name: 'Analytiques avancées temps réel', included: true },
          { name: 'Rapports personnalisés illimités', included: true },
          { name: 'Export de données automatisé', included: true },
          { name: 'BI et Data warehouse intégrés', included: true }
        ]
      },
      {
        category: 'Intégrations Enterprise',
        items: [
          { name: 'API illimitées', included: true },
          { name: 'Intégrations sur mesure', included: true },
          { name: 'SDK complet multi-plateforme', included: true },
          { name: 'Migration assistée depuis autre plateforme', included: true }
        ]
      },
      {
        category: 'Support VIP',
        items: [
          { name: 'Support 24/7/365 multicanal', included: true, highlight: true },
          { name: 'Équipe dédiée d\'ingénieurs', included: true, highlight: true },
          { name: 'Hotline directe executive', included: true },
          { name: 'Formation sur site illimitée', included: true },
          { name: 'Success Manager dédié', included: true }
        ]
      }
    ],
    cta: 'Contacter les ventes'
  }
];

// Composant de fonctionnalité
const FeatureItem = ({ 
  name, 
  included, 
  highlight, 
  value 
}: { 
  name: string; 
  included: boolean; 
  highlight?: boolean; 
  value?: string;
}) => (
  <li className={`
    flex items-start gap-3 py-2
    ${highlight ? 'bg-primary/5 -mx-2 px-2 rounded' : ''}
  `}>
    <span className={`
      flex-shrink-0 mt-0.5
      ${included ? 'text-primary' : 'text-text-subtle'}
    `}>
      {included ? (
        <Check className="w-5 h-5" strokeWidth={2.5} />
      ) : (
        <X className="w-5 h-5" />
      )}
    </span>
    <div className="flex-1">
      <span className={`
        text-sm
        ${included ? 'text-text-main' : 'text-text-subtle line-through'}
        ${highlight ? 'font-semibold' : ''}
      `}>
        {name}
      </span>
      {value && included && (
        <span className="ml-2 text-xs text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-full">
          {value}
        </span>
      )}
    </div>
  </li>
);

// Composant de carte de forfait
const PlanCard = ({ plan, isAnnual }: { plan: Plan; isAnnual: boolean }) => {
  const isPro = plan.id === 'pro';
  const finalPrice = isAnnual && !isPro ? (plan.price * 10).toFixed(2) : plan.price.toFixed(2);
  const monthlyPrice = isAnnual && !isPro ? (plan.price * 10 / 12).toFixed(2) : plan.price.toFixed(2);

  return (
    <div className={`
      relative panel-card p-6 sm:p-8 rounded-2xl
      border-2 transition-all duration-300 hover-lift
      ${plan.popular 
        ? `${plan.color.border} shadow-2xl scale-105 z-10` 
        : 'border-border-main hover:border-primary/30'
      }
    `}>
      
      {/* Badge populaire */}
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
          <div className={`
            px-4 py-1.5 rounded-full text-white text-sm font-bold
            bg-gradient-to-r ${plan.color.gradient}
            shadow-lg animate-bounce-in flex items-center gap-2
          `}>
            <Star className="w-4 h-4 fill-current" />
            {plan.badge}
          </div>
        </div>
      )}

      {/* Badge standard */}
      {!plan.popular && plan.badge && (
        <div className={`
          inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4
          ${plan.color.bg} ${plan.color.primary}
        `}>
          {plan.badge}
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6 mt-2">
        <div className={`
          w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center
          bg-gradient-to-br ${plan.color.gradient} text-white
          animate-scale-in
        `}>
          {plan.icon}
        </div>

        <h3 className="text-2xl font-bold text-text-main mb-2">
          {plan.name}
        </h3>
        <p className="text-sm text-text-subtle">
          {plan.tagline}
        </p>
      </div>

      {/* Prix */}
      <div className="text-center mb-6 pb-6 border-b border-border-main">
        {!isPro ? (
          <>
            <div className="flex items-center justify-center gap-2 mb-2">
              {plan.originalPrice && (
                <span className="text-lg text-text-subtle line-through">
                  {plan.originalPrice.toFixed(2)}€
                </span>
              )}
              {plan.savings && (
                <span className="bg-error/10 text-error text-xs font-bold px-2 py-1 rounded-full">
                  {plan.savings}
                </span>
              )}
            </div>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl sm:text-5xl font-bold text-text-main">
                {isAnnual ? monthlyPrice : finalPrice}€
              </span>
              <span className="text-text-subtle">{plan.period}</span>
            </div>
            {isAnnual && (
              <div className="mt-2 text-sm text-text-subtle">
                Facturé {finalPrice}€ annuellement
                <div className="text-xs text-primary font-semibold mt-1">
                  💰 Économisez {(plan.price * 2).toFixed(2)}€/an
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-4">
            <div className="text-3xl font-bold text-text-main mb-2">
              Prix sur mesure
            </div>
            <p className="text-sm text-text-subtle">
              Adapté à vos besoins spécifiques
            </p>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="space-y-6 mb-6">
        {plan.features.map((category, idx) => (
          <div key={idx} className="animate-slide-up" style={{ animationDelay: `${idx * 50}ms` }}>
            <h4 className="font-semibold text-sm text-text-main mb-3 flex items-center gap-2">
              {category.category}
            </h4>
            <ul className="space-y-1">
              {category.items.map((item, itemIdx) => (
                <FeatureItem key={itemIdx} {...item} />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button className={`
        w-full py-4 rounded-xl font-semibold text-base
        transition-all duration-300 ripple
        ${plan.popular
          ? `bg-gradient-to-r ${plan.color.gradient} text-white hover:shadow-xl hover:scale-105`
          : 'bg-panel border-2 border-border-main text-text-main hover:border-primary hover:bg-primary/5'
        }
      `}>
        <span className="flex items-center justify-center gap-2">
          {plan.cta}
          <ChevronRight className="w-5 h-5" />
        </span>
      </button>

      {/* Garantie */}
      {!isPro && (
        <div className="mt-4 text-center text-xs text-text-subtle">
          ✓ Sans engagement • Annulation à tout moment
        </div>
      )}
    </div>
  );
};

export default function Billing() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-background-app to-panel" id="billings">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16 animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <Gift className="w-4 h-4" />
            Offre de lancement - 40% de réduction
          </div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-main mb-4">
            Choisissez Votre Forfait MyZapp
          </h2>
          <p className="text-lg sm:text-xl text-text-subtle max-w-2xl mx-auto mb-8">
            Des tarifs transparents adaptés à tous les besoins. Commencez gratuitement, évoluez quand vous voulez.
          </p>

          {/* Toggle Annuel/Mensuel */}
          <div className="inline-flex items-center gap-4 bg-panel p-2 rounded-full border-2 border-border-main shadow-lg">
            <button
              onClick={() => setIsAnnual(false)}
              className={`
                px-6 py-2 rounded-full text-sm font-semibold transition-all
                ${!isAnnual 
                  ? 'bg-primary text-white shadow-lg' 
                  : 'text-text-subtle hover:text-text-main'
                }
              `}
            >
              Mensuel
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`
                px-6 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2
                ${isAnnual 
                  ? 'bg-primary text-white shadow-lg' 
                  : 'text-text-subtle hover:text-text-main'
                }
              `}
            >
              Annuel
              <span className="bg-accent text-white text-xs px-2 py-0.5 rounded-full">
                -17%
              </span>
            </button>
          </div>
        </div>

        {/* Grille de forfaits */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8 max-w-7xl mx-auto mb-12">
          {plans.map((plan, idx) => (
            <div 
              key={plan.id} 
              className="animate-scale-in"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <PlanCard plan={plan} isAnnual={isAnnual} />
            </div>
          ))}
        </div>

        {/* Social Proof */}
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-6 text-center animate-slide-up" style={{ animationDelay: '400ms' }}>
            <div className="panel-card p-6 rounded-xl">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-3xl font-bold text-text-main">50K+</span>
              </div>
              <p className="text-sm text-text-subtle">Utilisateurs actifs</p>
            </div>
            <div className="panel-card p-6 rounded-xl">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="w-5 h-5 text-amber-500 fill-current" />
                <span className="text-3xl font-bold text-text-main">4.9</span>
              </div>
              <p className="text-sm text-text-subtle">Note moyenne</p>
            </div>
            <div className="panel-card p-6 rounded-xl">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                <span className="text-3xl font-bold text-text-main">98%</span>
              </div>
              <p className="text-sm text-text-subtle">Satisfaction client</p>
            </div>
          </div>
        </div>

        {/* FAQ Rapide */}
        <div className="mt-16 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '500ms' }}>
          <h3 className="text-2xl font-bold text-text-main text-center mb-8">
            Questions fréquentes
          </h3>
          <div className="space-y-4">
            {[
              {
                q: 'Puis-je changer de forfait à tout moment ?',
                a: 'Absolument ! Vous pouvez upgrader ou downgrader votre forfait à tout moment. Les changements prennent effet immédiatement.'
              },
              {
                q: 'Y a-t-il une période d\'essai gratuite ?',
                a: 'Oui ! Tous nos forfaits (sauf Young) incluent 14 jours d\'essai gratuit. Aucune carte bancaire requise.'
              },
              {
                q: 'Que se passe-t-il si j\'annule ?',
                a: 'Vous conservez l\'accès jusqu\'à la fin de votre période de facturation. Vos données sont conservées 90 jours.'
              },
              {
                q: 'Proposez-vous des réductions pour les associations ?',
                a: 'Oui ! Contactez notre équipe commerciale pour obtenir jusqu\'à 50% de réduction pour les organisations à but non lucratif.'
              }
            ].map((faq, idx) => (
              <details 
                key={idx} 
                className="panel-card p-4 rounded-lg group cursor-pointer hover:shadow-md transition-all"
              >
                <summary className="font-semibold text-text-main flex items-center justify-between">
                  {faq.q}
                  <ChevronRight className="w-5 h-5 text-text-subtle group-open:rotate-90 transition-transform" />
                </summary>
                <p className="mt-3 text-sm text-text-subtle leading-relaxed">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>

        {/* CTA Final */}
        <div className="mt-16 text-center animate-slide-up" style={{ animationDelay: '600ms' }}>
          <div className="bg-gradient-to-r from-primary to-accent p-8 rounded-2xl text-white max-w-3xl mx-auto shadow-2xl">
            <Award className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-2xl sm:text-3xl font-bold mb-3">
              Encore des doutes ?
            </h3>
            <p className="text-white/90 mb-6 max-w-xl mx-auto">
              Discutez avec notre équipe pour trouver le forfait parfait pour vos besoins. 
              Nous sommes là pour vous aider !
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-primary bg-white text-primary hover:bg-white/90 flex items-center justify-center gap-2">
                <Headphones className="w-5 h-5" />
                Parler à un expert
              </button>
              <button className="px-6 py-3 rounded-full border-2 border-white text-white hover:bg-white/10 transition-all font-semibold">
                Voir une démo
              </button>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 opacity-50">
          <div className="flex items-center gap-2 text-sm text-text-subtle">
            <Shield className="w-4 h-4" />
            <span>Paiement sécurisé SSL</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-text-subtle">
            <Check className="w-4 h-4" />
            <span>Conformité RGPD</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-text-subtle">
            <Globe className="w-4 h-4" />
            <span>Disponible dans 150+ pays</span>
          </div>
        </div>

      </div>
    </section>
  );
}