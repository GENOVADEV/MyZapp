import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendPasswordResetOTP } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email requis." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Cette adresse email n'est pas enregistrée chez MyZapp." },
        { status: 404 }
      );
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode, otpExpiry }
    });

    await sendPasswordResetOTP(cleanEmail, otpCode);

    return NextResponse.json({
      success: true,
      message: "Un code de récupération a été envoyé à votre adresse email. Veuillez vérifier vos spams.",
      email: cleanEmail
    });
  } catch (error: any) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de l'envoi du code." },
      { status: 500 }
    );
  }
}
