// src/app/login/metadata.ts
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion - MyZapp | Messagerie Révolutionnaire",
  description: "Connectez-vous à MyZapp pour accéder à des fonctionnalités WhatsApp exclusives : mode invisible, messages programmés, traduction automatique, et bien plus. Essai gratuit 14 jours.",
  
  keywords: [
    "connexion MyZapp",
    "login messagerie",
    "WhatsApp amélioré",
    "messagerie sécurisée",
    "chat privé",
    "mode invisible WhatsApp",
    "messages programmés",
    "traduction automatique messages"
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
    url: "https://myzapp.com/login",
    siteName: "MyZapp",
    title: "Connexion à MyZapp - Messagerie Nouvelle Génération",
    description: "Accédez à votre compte MyZapp et profitez de 20+ fonctionnalités exclusives pour révolutionner votre expérience WhatsApp. Sécurité maximale garantie.",
    images: [
      {
        url: "/images/og-login.png",
        width: 1200,
        height: 630,
        alt: "MyZapp - Connexion à la messagerie révolutionnaire",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Connexion - MyZapp",
    description: "Connectez-vous à MyZapp pour une expérience de messagerie révolutionnaire avec 20+ fonctionnalités exclusives.",
    images: ["/images/twitter-login.png"],
    creator: "@myzapp",
  },

  alternates: {
    canonical: "https://myzapp.com/login",
    languages: {
      "fr-FR": "https://myzapp.com/fr/login",
      "en-US": "https://myzapp.com/en/login",
      "es-ES": "https://myzapp.com/es/login",
    },
  },

  verification: {
    google: "votre-code-google-search-console",
    yandex: "votre-code-yandex",
    other: {
      "facebook-domain-verification": "votre-code-facebook",
    },
  },

  category: "technology",
  
  manifest: "/manifest.json",

  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png" },
    ],
  },

  appleWebApp: {
    capable: true,
    title: "MyZapp Login",
    statusBarStyle: "black-translucent",
  },

  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },

  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "application-name": "MyZapp",
    "msapplication-TileColor": "#008069",
    "theme-color": "#008069",
  },
};
