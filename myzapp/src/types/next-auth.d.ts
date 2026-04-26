// types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * On étend la session par défaut pour y inclure l'ID et le rôle
   */
  interface Session {
    user: {
      id: string;
      role?: string;
    } & DefaultSession["user"];
  }

  /**
   * On étend aussi l'objet User retourné par la base de données
   */
  interface User {
    id: string;
    role?: string;
  }
}