import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const viewport: Viewport = {
  themeColor: "#00D06C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://my-zapp.vercel.app"),
  title: "MyZapp - Boostez WhatsApp, Dépassez les Limites | Bot IA & Automatisation",
  description: "Plateforme n°1 d'automatisation WhatsApp : Chatbot IA Gemini, diffusion anti-ban intelligente, téléchargeur de médias 4K, gestion de groupes et CRM.",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "MyZapp - Boostez WhatsApp, Dépassez les Limites",
    description: "Le Bot WhatsApp IA le plus avancé avec diffusion anti-ban et chatbot conversationnel.",
    url: "https://my-zapp.vercel.app",
    siteName: "MyZapp",
    images: [
      {
        url: "/logo.svg",
        width: 800,
        height: 800,
        alt: "MyZapp Logo",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" data-theme="myzapp" className="dark">
      <body className="min-h-screen bg-[#060D1F] text-slate-100 antialiased selection:bg-[#00D06C] selection:text-[#060D1F]">
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <div className="flex-1">{children}</div>
          <Footer />
        </div>
      </body>
    </html>
  );
}
