import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signJwt } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Email et code OTP requis." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé." }, { status: 404 });
    }

    if (user.isVerified) {
      return NextResponse.json({ error: "Ce compte est déjà vérifié." }, { status: 400 });
    }

    if (user.otpCode !== otp.trim()) {
      return NextResponse.json({ error: "Code OTP incorrect." }, { status: 400 });
    }

    if (user.otpExpiry && user.otpExpiry < new Date()) {
      return NextResponse.json({ error: "Le code OTP a expiré." }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        otpCode: null,
        otpExpiry: null
      }
    });

    const token = signJwt({
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role
    });

    return NextResponse.json({
      success: true,
      message: "Votre compte a été vérifié avec succès !",
      token,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        activeSession: updatedUser.activeSession
      }
    });
  } catch (error: any) {
    console.error("Verify OTP Error:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la vérification." },
      { status: 500 }
    );
  }
}
