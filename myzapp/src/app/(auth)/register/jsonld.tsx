// src/app/register/jsonld.tsx
/**
 * Données structurées JSON-LD pour améliorer le SEO de la page d'inscription
 * Optimisé pour la conversion et les rich snippets Google
 */

export function RegisterJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://myzapp.com/register",
        url: "https://myzapp.com/register",
        name: "Inscription Gratuite - MyZapp",
        description: "Créez votre compte MyZapp gratuitement. Essai 14 jours sans carte bancaire. Accédez à 20+ fonctionnalités exclusives.",
        inLanguage: "fr-FR",
        isPartOf: {
          "@id": "https://myzapp.com/#website"
        },
        breadcrumb: {
          "@id": "https://myzapp.com/register#breadcrumb"
        },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: "https://myzapp.com/images/register-hero.png",
          width: 1200,
          height: 630
        },
        datePublished: "2025-01-01",
        dateModified: "2025-01-15"
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://myzapp.com/register#breadcrumb",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Accueil",
            item: "https://myzapp.com"
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Inscription",
            item: "https://myzapp.com/register"
          }
        ]
      },
      {
        "@type": "WebSite",
        "@id": "https://myzapp.com/#website",
        url: "https://myzapp.com",
        name: "MyZapp",
        description: "Messagerie révolutionnaire avec 20+ fonctionnalités exclusives",
        publisher: {
          "@id": "https://myzapp.com/#organization"
        }
      },
      {
        "@type": "Organization",
        "@id": "https://myzapp.com/#organization",
        name: "MyZapp",
        url: "https://myzapp.com",
        logo: {
          "@type": "ImageObject",
          url: "https://myzapp.com/images/logo.png",
          width: 512,
          height: 512
        },
        sameAs: [
          "https://facebook.com/myzapp",
          "https://twitter.com/myzapp",
          "https://linkedin.com/company/myzapp",
          "https://instagram.com/myzapp"
        ]
      },
      {
        "@type": "Offer",
        "@id": "https://myzapp.com/register#free-trial-offer",
        name: "Essai Gratuit MyZapp 14 Jours",
        description: "Essayez MyZapp gratuitement pendant 14 jours sans carte bancaire. Accès complet à toutes les fonctionnalités.",
        price: "0",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        validFrom: "2025-01-01",
        priceValidUntil: "2025-12-31",
        url: "https://myzapp.com/register",
        seller: {
          "@id": "https://myzapp.com/#organization"
        },
        eligibleRegion: {
          "@type": "Place",
          name: "Worldwide"
        },
        itemOffered: {
          "@type": "SoftwareApplication",
          name: "MyZapp",
          applicationCategory: "CommunicationApplication",
          operatingSystem: "Web, iOS, Android"
        }
      },
      {
        "@type": "Action",
        "@id": "https://myzapp.com/register#signup-action",
        actionStatus: "https://schema.org/PotentialActionStatus",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://myzapp.com/register",
          actionPlatform: [
            "http://schema.org/DesktopWebPlatform",
            "http://schema.org/MobileWebPlatform",
            "http://schema.org/IOSPlatform",
            "http://schema.org/AndroidPlatform"
          ]
        },
        object: {
          "@type": "Product",
          name: "MyZapp Account",
          description: "Compte utilisateur MyZapp avec accès aux fonctionnalités premium"
        }
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "L'inscription est-elle vraiment gratuite ?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Oui, l'inscription à MyZapp est 100% gratuite. Vous bénéficiez d'un essai gratuit de 14 jours sans avoir à entrer de carte bancaire. Aucun engagement, vous pouvez annuler à tout moment."
            }
          },
          {
            "@type": "Question",
            name: "Ai-je besoin d'une carte bancaire pour m'inscrire ?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Non ! Aucune carte bancaire n'est requise pour l'inscription. Vous pouvez tester toutes les fonctionnalités pendant 14 jours gratuitement, sans engagement."
            }
          },
          {
            "@type": "Question",
            name: "Combien de temps dure l'essai gratuit ?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "L'essai gratuit dure 14 jours. Pendant cette période, vous avez accès à toutes les fonctionnalités premium de MyZapp sans restriction."
            }
          },
          {
            "@type": "Question",
            name: "Que se passe-t-il après l'essai gratuit ?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "À la fin de l'essai gratuit, vous pouvez choisir un forfait adapté à vos besoins (Young, Agent, Business, Pro) ou rester sur le forfait gratuit avec fonctionnalités de base. Aucun paiement automatique."
            }
          },
          {
            "@type": "Question",
            name: "Mes données sont-elles en sécurité ?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Absolument. MyZapp utilise un chiffrement de bout en bout (E2EE), est conforme au RGPD, et ne vend jamais vos données. Vos conversations sont 100% privées et sécurisées."
            }
          },
          {
            "@type": "Question",
            name: "Puis-je utiliser mon numéro WhatsApp existant ?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Oui ! MyZapp est compatible avec votre numéro WhatsApp existant. Vous pouvez synchroniser vos contacts et conversations facilement lors de l'inscription."
            }
          },
          {
            "@type": "Question",
            name: "Comment annuler mon compte ?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Vous pouvez annuler votre compte à tout moment depuis les paramètres, en un seul clic. Aucune question posée, aucun frais d'annulation. Vos données peuvent être exportées avant la suppression."
            }
          },
          {
            "@type": "Question",
            name: "Y a-t-il une limite d'utilisateurs ou de messages ?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Non ! Avec MyZapp, vous bénéficiez de messages illimités, de groupes sans limite de participants (selon le forfait), et d'un stockage généreux pour vos médias."
            }
          }
        ]
      },
      {
        "@type": "HowTo",
        name: "Comment s'inscrire sur MyZapp",
        description: "Guide étape par étape pour créer votre compte MyZapp en 3 minutes",
        totalTime: "PT3M",
        step: [
          {
            "@type": "HowToStep",
            position: 1,
            name: "Remplissez vos informations",
            text: "Entrez votre nom complet et numéro de téléphone",
            image: "https://myzapp.com/images/signup-step1.png"
          },
          {
            "@type": "HowToStep",
            position: 2,
            name: "Créez votre identifiant",
            text: "Choisissez votre adresse email qui servira d'identifiant de connexion",
            image: "https://myzapp.com/images/signup-step2.png"
          },
          {
            "@type": "HowToStep",
            position: 3,
            name: "Sécurisez votre compte",
            text: "Créez un mot de passe fort et acceptez les conditions d'utilisation",
            image: "https://myzapp.com/images/signup-step3.png"
          },
          {
            "@type": "HowToStep",
            position: 4,
            name: "C'est terminé !",
            text: "Votre compte est créé. Profitez de 14 jours d'essai gratuit avec toutes les fonctionnalités premium",
            image: "https://myzapp.com/images/signup-success.png"
          }
        ]
      },
      {
        "@type": "Service",
        "@id": "https://myzapp.com/#service",
        serviceType: "Messaging Platform",
        provider: {
          "@id": "https://myzapp.com/#organization"
        },
        areaServed: {
          "@type": "Place",
          name: "Worldwide"
        },
        availableChannel: [
          {
            "@type": "ServiceChannel",
            serviceUrl: "https://myzapp.com",
            serviceType: "Web Application"
          },
          {
            "@type": "ServiceChannel",
            serviceUrl: "https://apps.apple.com/app/myzapp",
            serviceType: "iOS Application"
          },
          {
            "@type": "ServiceChannel",
            serviceUrl: "https://play.google.com/store/apps/details?id=com.myzapp",
            serviceType: "Android Application"
          }
        ],
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "MyZapp Pricing Plans",
          itemListElement: [
            {
              "@type": "Offer",
              name: "MyZapp Young",
              price: "2.99",
              priceCurrency: "EUR",
              description: "Pour les étudiants et jeunes actifs"
            },
            {
              "@type": "Offer",
              name: "MyZapp Agent",
              price: "9.99",
              priceCurrency: "EUR",
              description: "Pour les professionnels indépendants"
            },
            {
              "@type": "Offer",
              name: "MyZapp Business",
              price: "24.99",
              priceCurrency: "EUR",
              description: "Pour les équipes et petites entreprises"
            },
            {
              "@type": "Offer",
              name: "MyZapp Pro",
              price: "0",
              priceCurrency: "EUR",
              description: "Sur mesure pour les grandes entreprises"
            }
          ]
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.9",
          reviewCount: "12847",
          bestRating: "5",
          worstRating: "1"
        }
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
