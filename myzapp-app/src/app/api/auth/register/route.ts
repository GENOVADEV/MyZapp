import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { sendOTP } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const { name, phone, email, password, confirmPassword } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Veuillez renseigner le nom, l'email et le mot de passe." },
        { status: 400 }
      );
    }

    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json(
        { error: "Les mots de passe ne correspondent pas." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Le mot de passe doit comporter au moins 6 caractères." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Cette adresse email est déjà associée à un compte MyZapp." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.user.create({
      data: {
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        email: cleanEmail,
        passwordHash,
        isVerified: false,
        otpCode,
        otpExpiry,
        role: "USER"
      }
    });

    // Send verification email
    await sendOTP(cleanEmail, otpCode);

    return NextResponse.json({
      success: true,
      message: "Compte créé ! Veuillez vérifier votre email pour entrer le code OTP.",
      requiresVerification: true,
      email: cleanEmail
    });
  } catch (error: any) {
    console.error("Register Error:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la création du compte." },
      { status: 500 }
    );
  }
}
