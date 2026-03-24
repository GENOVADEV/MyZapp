// src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    // 1. Récupérer les données envoyées par le front-end
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "L'email et le mot de passe sont requis." },
        { status: 400 }
      );
    }

    // 2. Chercher l'utilisateur dans la base de données PostgreSQL
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    // Si l'utilisateur n'existe pas ou s'il s'est inscrit via Google/Apple (pas de mot de passe)
    if (!user || !user.password) {
      return NextResponse.json(
        { success: false, message: "Identifiants incorrects." },
        { status: 401 } // 401 Unauthorized
      );
    }

    // 3. Vérifier si le compte est verrouillé (sécurité anti-brute force)
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json(
        { success: false, message: "Compte temporairement verrouillé. Réessayez plus tard." },
        { status: 403 }
      );
    }

    // 4. Comparer le mot de passe tapé avec le mot de passe crypté dans la DB
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Incrémenter les tentatives échouées (grâce à ton super schéma Prisma)
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: { increment: 1 } },
      });

      return NextResponse.json(
        { success: false, message: "Identifiants incorrects." },
        { status: 401 }
      );
    }

    // 5. Le mot de passe est bon ! On génère le Token de session (JWT)
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET n'est pas défini dans le fichier .env");
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        plan: user.plan 
      },
      jwtSecret,
      { expiresIn: "7d" } // Le token expire dans 7 jours
    );

    // 6. Mettre à jour les stats de l'utilisateur (remettre les erreurs à 0)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
        // On récupère l'IP si possible pour les logs de sécurité
        lastLoginIp: req.headers.get("x-forwarded-for") || "Inconnue", 
      },
    });

    // 7. Renvoyer le succès, le token, et les infos utiles
    return NextResponse.json(
      {
        success: true,
        message: "Connexion réussie !",
        token: token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          plan: user.plan,
          image: user.image
        },
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Erreur lors de la connexion :", error);
    return NextResponse.json(
      { success: false, message: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}