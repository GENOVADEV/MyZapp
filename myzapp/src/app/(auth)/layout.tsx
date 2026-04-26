// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { Toaster } from "sonner";

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
        {/* On a retiré le BotProvider et le ChatProvider ! */}
        <main>{children}</main>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}