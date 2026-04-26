// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css"; // Assure-toi que le chemin vers ton CSS est correct
import { Toaster } from "sonner"; // Optionnel: garde-le si tu veux des pop-ups de notification

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MyZapp Dashboard",
  description: "Gérez votre bot WhatsApp facilement",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <main>{children}</main>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}