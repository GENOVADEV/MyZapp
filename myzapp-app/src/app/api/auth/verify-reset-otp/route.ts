import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

    if (user.otpCode !== otp.trim()) {
      return NextResponse.json({ error: "Code OTP incorrect." }, { status: 400 });
    }

    if (user.otpExpiry && user.otpExpiry < new Date()) {
      return NextResponse.json({ error: "Le code OTP a expiré." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Code validé avec succès. Vous pouvez définir votre nouveau mot de passe."
    });
  } catch (error: any) {
    console.error("Verify Reset OTP Error:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la vérification." },
      { status: 500 }
    );
  }
}
