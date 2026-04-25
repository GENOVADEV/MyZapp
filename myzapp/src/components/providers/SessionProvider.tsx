"use client";

import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/contexts/AuthContext";
import { BotProvider } from "@/contexts/BotContext";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthProvider>
        <BotProvider>
              {children}
        </BotProvider>
      </AuthProvider>
    </SessionProvider>
  );
}
