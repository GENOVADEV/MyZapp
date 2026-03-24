// src/app/register/layout.tsx
import { Metadata } from "next";
import { RegisterJsonLd } from "./jsonld";

export const metadata: Metadata = {
  title: "Inscription Gratuite - MyZapp | Essai 14 Jours Sans Carte",
  description: "Créez votre compte MyZapp gratuitement et profitez de 14 jours d'essai. 20+ fonctionnalités exclusives : mode invisible, messages programmés, traduction auto. Sans engagement, sans carte bancaire.",
  
  keywords: [
    "inscription MyZapp",
    "créer compte messagerie",
    "essai gratuit WhatsApp",
    "messagerie sécurisée gratuite",
    "signup MyZapp",
    "nouveau compte chat",
    "inscription sans carte bancaire",
    "essai 14 jours gratuit",
    "messagerie professionnelle",
    "WhatsApp amélioré inscription"
  ],

  authors: [{ name: "MyZapp Team" }],
  creator: "MyZapp",
  publisher: "MyZapp",
  
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://myzapp.com/register",
    siteName: "MyZapp",
    title: "Créez Votre Compte MyZapp - 14 Jours Gratuits",
    description: "Rejoignez 50 000+ utilisateurs qui ont révolutionné leur messagerie. Inscription gratuite, essai 14 jours sans carte bancaire. 20+ fonctionnalités exclusives vous attendent.",
    images: [
      {
        url: "/images/og-register.png",
        width: 1200,
        height: 630,
        alt: "MyZapp - Inscription gratuite avec essai 14 jours",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Inscription Gratuite - MyZapp",
    description: "Créez votre compte gratuitement et profitez de 14 jours d'essai. 20+ fonctionnalités exclusives pour révolutionner votre messagerie.",
    images: ["/images/twitter-register.png"],
    creator: "@myzapp",
  },

  alternates: {
    canonical: "https://myzapp.com/register",
    languages: {
      "fr-FR": "https://myzapp.com/fr/register",
      "en-US": "https://myzapp.com/en/register",
      "es-ES": "https://myzapp.com/es/register",
    },
  },

  verification: {
    google: "votre-code-google-search-console",
    yandex: "votre-code-yandex",
  },

  category: "technology",
  manifest: "/manifest.json",

  other: {
    "price": "0.00",
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStock",
    "offerType": "Free Trial",
  },
};

export default function RegisterLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <RegisterJsonLd />
      {children}
    </>
  );
}
