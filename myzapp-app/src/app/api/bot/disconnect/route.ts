import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { activeSession: null }
    });

    return NextResponse.json({
      success: true,
      message: "Session WhatsApp déconnectée."
    });
  } catch (error: any) {
    console.error("POST /api/bot/disconnect error:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la déconnexion." },
      { status: 500 }
    );
  }
}
