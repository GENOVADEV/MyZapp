// src/app/login/jsonld.tsx
/**
 * Données structurées JSON-LD pour améliorer le SEO de la page de connexion
 * Ces données aident les moteurs de recherche à mieux comprendre le contenu
 */

export function LoginJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://myzapp.com/login",
        url: "https://myzapp.com/login",
        name: "Connexion - MyZapp",
        description: "Page de connexion sécurisée pour accéder à votre compte MyZapp et profiter de fonctionnalités WhatsApp exclusives.",
        inLanguage: "fr-FR",
        isPartOf: {
          "@id": "https://myzapp.com/#website"
        },
        breadcrumb: {
          "@id": "https://myzapp.com/login#breadcrumb"
        }
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://myzapp.com/login#breadcrumb",
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
            name: "Connexion",
            item: "https://myzapp.com/login"
          }
        ]
      },
      {
        "@type": "WebSite",
        "@id": "https://myzapp.com/#website",
        url: "https://myzapp.com",
        name: "MyZapp",
        description: "Messagerie révolutionnaire avec 20+ fonctionnalités exclusives pour améliorer votre expérience WhatsApp",
        publisher: {
          "@id": "https://myzapp.com/#organization"
        },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: "https://myzapp.com/search?q={search_term_string}"
          },
          "query-input": "required name=search_term_string"
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
        ],
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+33-1-XX-XX-XX-XX",
          contactType: "Customer Service",
          availableLanguage: ["French", "English", "Spanish"],
          areaServed: "Worldwide"
        }
      },
      {
        "@type": "SoftwareApplication",
        name: "MyZapp",
        applicationCategory: "CommunicationApplication",
        operatingSystem: "Web, iOS, Android",
        offers: {
          "@type": "AggregateOffer",
          lowPrice: "0",
          highPrice: "24.99",
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock"
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.9",
          reviewCount: "12847",
          bestRating: "5",
          worstRating: "1"
        },
        featureList: [
          "Mode invisible total",
          "Messages programmés",
          "Traduction automatique",
          "Transcription vocale",
          "Groupes illimités",
          "Appels vidéo 50 participants",
          "Stockage cloud",
          "Chiffrement de bout en bout"
        ]
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "MyZapp est-il gratuit ?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "MyZapp propose un forfait gratuit avec fonctionnalités de base, ainsi que des forfaits premium (Young, Agent, Business, Pro) avec des fonctionnalités avancées à partir de 2,99€/mois."
            }
          },
          {
            "@type": "Question",
            name: "Mes données sont-elles sécurisées ?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Absolument. MyZapp utilise un chiffrement de bout en bout (E2EE) pour toutes les communications, conforme aux normes RGPD. Vos données ne sont jamais vendues à des tiers."
            }
          },
          {
            "@type": "Question",
            name: "Puis-je utiliser MyZapp sur plusieurs appareils ?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Oui ! MyZapp se synchronise automatiquement sur tous vos appareils (smartphone, tablette, ordinateur) pour une expérience fluide partout."
            }
          },
          {
            "@type": "Question",
            name: "Quelle est la différence avec WhatsApp classique ?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "MyZapp ajoute 20+ fonctionnalités exclusives à WhatsApp : mode invisible, programmation de messages, traduction automatique, transcription vocale, groupes illimités, modération IA, et bien plus."
            }
          }
        ]
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
