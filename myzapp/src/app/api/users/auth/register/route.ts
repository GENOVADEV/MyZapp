// src/app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {
    // 1. Récupérer les données envoyées par le front-end
    const body = await req.json();
    const { name, email, password, phone } = body;

    // 2. Validation basique
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Tous les champs sont requis." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Le mot de passe doit contenir au moins 6 caractères." },
        { status: 400 }
      );
    }

    // 3. Vérifier si l'utilisateur existe déjà dans la base de données
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { phone: phone },
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Un compte existe déjà avec cet email." },
        { status: 409 } // 409 Conflict
      );
    }

    // 4. Sécuriser (Hacher) le mot de passe
    // Le '10' est le "salt rounds" (le niveau de complexité du cryptage)
    const hashedPassword = await bcrypt.hash(password, 10);
    const date = new Date();

    // 5. Créer le nouvel utilisateur dans PostgreSQL
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        status: "ACTIVE",
        role: "USER",
        plan: "FREE",
        phone,
        createdAt: date
      },
    });

    // 6. Renvoyer une réponse de succès (SANS le mot de passe !)
    return NextResponse.json(
      {
        success: true,
        message: "Compte créé avec succès !",
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          phone: newUser.phone,
          status: newUser.status,
          plan: newUser.plan,
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt,
          
        },
      },
      { status: 201 } // 201 Created
    );

  } catch (error: any) {
    console.error("Erreur lors de l'inscription :", error);
    return NextResponse.json(
      { success: false, message: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}