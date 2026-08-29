import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
    } catch (e) {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    const { session } = await req.json();

    if (!session || typeof session !== "string" || !session.trim().startsWith("RGNK~")) {
      return NextResponse.json(
        { error: "Format de session invalide. Le code doit débuter par 'RGNK~'" },
        { status: 400 }
      );
    }

    const cleanSession = session.trim();

    // 1. Mettre à jour le profil utilisateur en base de données
    const updatedUser = await prisma.user.update({
      where: { id: decoded.userId },
      data: { activeSession: cleanSession }
    });

    // 2. Mettre à jour la table des variables du bot (PostgreSQL)
    try {
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
    } catch (dbVarErr) {
      console.warn("Could not sync BotVariable table:", dbVarErr);
    }

    // 3. Notifier le serveur de bot pour démarrer immédiatement la session
    const botServerUrl = process.env.BOT_SERVER_URL || "https://myzapp-bot.onrender.com";
    let serverResponse: any = null;

    try {
      const response = await fetch(`${botServerUrl}/api/bot/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: cleanSession })
      });

      if (response.ok) {
        serverResponse = await response.json();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.warn("Bot server connect warning:", errorData);
      }
    } catch (serverErr: any) {
      console.warn("Bot server webhook notice:", serverErr?.message || serverErr);
    }

    return NextResponse.json({
      success: true,
      message: serverResponse?.message || "Session liée avec succès ! Initialisation et connexion à WhatsApp en cours...",
      session: cleanSession,
      status: "connecting"
    });
  } catch (error: any) {
    console.error("POST /api/bot/connect error:", error);
    return NextResponse.json(
      { error: error.message || "Une erreur est survenue lors de l'enregistrement de la session." },
      { status: 500 }
    );
  }
}
