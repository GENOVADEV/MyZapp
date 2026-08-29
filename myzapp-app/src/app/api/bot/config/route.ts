import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
    } catch (e) {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    const newBotConfig = await req.json();

    // 1. Sauvegarder dans User.botConfig (JSON)
    const updatedUser = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        botConfig: typeof newBotConfig === 'string' ? newBotConfig : JSON.stringify(newBotConfig)
      }
    });

    // 2. Transmettre au serveur de bot si connecté
    if (updatedUser.activeSession) {
      const botServerUrl = process.env.BOT_SERVER_URL || "https://myzapp-bot.onrender.com";
      try {
        await fetch(`${botServerUrl}/api/bot/config`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session: updatedUser.activeSession,
            config: newBotConfig
          })
        });
      } catch (err) {
        console.warn("Could not push config to bot server:", err);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Configuration du bot enregistrée avec succès !",
      botConfig: newBotConfig
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
