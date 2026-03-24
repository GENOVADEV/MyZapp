// src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Importation de la police Google optimisée par Next
import "./globals.css";
import { ThemeProvider } from "next-themes"; // Import du provider de thème
import { AuthProvider } from "@/contexts/AuthContext"
import { BotProvider } from "@/contexts/BotContext";
import QueryProvider from "@/contexts/QueryProvider";

// Configuration de la police Inter
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "MyZapp - Le Dashboard WhatsApp Professionnel",
  description: "Gérez votre bot WhatsApp intelligemment. Sauvegarde de vues uniques et messages supprimés.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Note: className="dark" sera ajouté dynamiquement ici par ThemeProvider
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased font-sans`}>
        {/* Enveloppe l'app avec ThemeProvider en stratégie 'class' */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* 👇 2. Enveloppe {children} avec AuthProvider */}
          <AuthProvider>
            {/* 👇 1. Enveloppe {children} avec BotProvider */}
            <BotProvider>
              <QueryProvider>
                {children}
              </QueryProvider>
            </BotProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}