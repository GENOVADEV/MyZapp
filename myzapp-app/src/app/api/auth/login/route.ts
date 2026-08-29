import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { comparePassword, signJwt } from "@/lib/auth";
import { sendOTP } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Veuillez renseigner votre identifiant et votre mot de passe." },
        { status: 400 }
      );
    }

    const cleanIdentifier = identifier.trim();

    // Find user by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanIdentifier.toLowerCase() },
          { phone: cleanIdentifier }
        ]
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Identifiant ou mot de passe incorrect." },
        { status: 401 }
      );
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Identifiant ou mot de passe incorrect." },
        { status: 401 }
      );
    }

    // If not verified, generate new OTP and prompt verification
    if (!user.isVerified) {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: { otpCode, otpExpiry }
      });

      await sendOTP(user.email, otpCode);

      return NextResponse.json(
        {
          error: "Veuillez valider votre adresse email. Un nouveau code OTP a été envoyé.",
          requiresVerification: true,
          email: user.email
        },
        { status: 403 }
      );
    }

    const token = signJwt({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        activeSession: user.activeSession,
        botConfig: user.botConfig
      }
    });
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la connexion." },
      { status: 500 }
    );
  }
}
