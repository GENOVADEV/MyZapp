import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function GET(req: Request) {
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

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const botServerUrl = process.env.BOT_SERVER_URL || "https://myzapp-bot.onrender.com";
    let botServerData: any = null;

    if (user.activeSession) {
      try {
        const response = await fetch(`${botServerUrl}/api/bot/status?session=${encodeURIComponent(user.activeSession)}`, {
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (response.ok) {
          botServerData = await response.json();
        }
      } catch (err) {
        console.warn("Could not reach bot server:", err);
      }
    }

    const isConnected = !!user.activeSession && (botServerData?.connected ?? true);

    return NextResponse.json({
      connected: isConnected,
      session: user.activeSession,
      botConfig: user.botConfig ? (typeof user.botConfig === 'string' ? JSON.parse(user.botConfig) : user.botConfig) : null,
      stats: botServerData?.stats || {
        uptime: isConnected ? "En ligne" : "Arrêté",
        ping: "24ms"
      },
      broadcast: botServerData?.broadcast || { status: 'idle', progress: 0 }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
