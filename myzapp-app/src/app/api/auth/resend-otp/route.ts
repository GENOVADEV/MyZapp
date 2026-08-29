import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendOTP, sendPasswordResetOTP } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const { email, reason } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email requis." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé." }, { status: 404 });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode, otpExpiry }
    });

    if (reason === "reset") {
      await sendPasswordResetOTP(cleanEmail, otpCode);
    } else {
      await sendOTP(cleanEmail, otpCode);
    }

    return NextResponse.json({
      success: true,
      message: "Un nouveau code de validation a été envoyé. Pensez à vérifier vos courriers indésirables (spams)."
    });
  } catch (error: any) {
    console.error("Resend OTP Error:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors du renvoi du code." },
      { status: 500 }
    );
  }
}
