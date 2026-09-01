"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/app");

  if (isDashboard) {
    return <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">{children}</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#060D1F] text-slate-100 antialiased selection:bg-[#00D06C] selection:text-[#060D1F]">
      <Navbar />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
