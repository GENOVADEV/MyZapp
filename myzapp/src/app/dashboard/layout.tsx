// src/app/dashboard/layout.tsx
import { Metadata } from "next";
import Sidebar from "@/components/layout/sidebar";
import DashboardHeader from "@/components/layout/dashboard-header";

export const metadata: Metadata = {
  title: "Dashboard - MyZapp",
  description: "Gérez vos conversations, contacts et paramètres MyZapp",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background-app flex">
      {/* Sidebar (fixed positioning handled internally) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* Header */}
        <DashboardHeader />

        {/* Page Content */}
        <main className="flex-1 overflow-auto mt-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
