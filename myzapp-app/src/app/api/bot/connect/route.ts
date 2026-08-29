import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { session } = await req.json();

    if (!session || typeof session !== "string" || !session.trim().startsWith("RGNK~")) {
      return NextResponse.json(
        { error: "Format de session invalide. La session doit commencer par 'RGNK~'" },
        { status: 400 }
      );
    }

    const cleanSession = session.trim();

    // 1. Update user profile
    await prisma.user.update({
      where: { id: user.id },
      data: { activeSession: cleanSession }
    });

    // 2. Update bot variables table for myzapp-server
    const botVar = await prisma.botVariable.findUnique({
      where: { key: "SESSION" }
    });

    if (!botVar) {
      await prisma.botVariable.create({
        data: { key: "SESSION", value: cleanSession }
      });
    } else {
      let currentVal = botVar.value || "";
      if (!currentVal.includes(cleanSession)) {
        currentVal = currentVal ? `${currentVal},${cleanSession}` : cleanSession;
        await prisma.botVariable.update({
          where: { key: "SESSION" },
          data: { value: currentVal }
        });
      }
    }

    // 3. Try to inform backend server if configured
    const botServerUrl = process.env.BOT_SERVER_URL || "https://myzapp-bot.onrender.com";
    try {
      await fetch(`${botServerUrl}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: cleanSession })
      });
    } catch (serverErr) {
      console.log("Bot server webhook notice:", serverErr);
    }

    return NextResponse.json({
      success: true,
      message: "Session WhatsApp connectée avec succès ! Le bot démarre et s'authentifie.",
      session: cleanSession
    });
  } catch (error: any) {
    console.error("POST /api/bot/connect error:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de l'enregistrement de la session." },
      { status: 500 }
    );
  }
}
