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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

        const response = await fetch(`${botServerUrl}/api/bot/status?session=${encodeURIComponent(user.activeSession)}`, {
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-cache' }
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          botServerData = await response.json();
        }
      } catch (err) {
        // Bot server not reachable or timeout
      }
    }

    const isConnected = !!user.activeSession && (botServerData?.connected ?? false);
    const rawStatus = user.activeSession 
      ? (botServerData?.status || (botServerData ? "disconnected" : "connecting"))
      : "disconnected";

    return NextResponse.json({
      connected: isConnected,
      status: rawStatus, // 'connected' | 'connecting' | 'disconnected' | 'error'
      statusMessage: botServerData?.message || (isConnected ? "En Ligne" : (user.activeSession ? "Authentification en cours..." : "Déconnecté")),
      session: user.activeSession,
      jid: botServerData?.jid || null,
      user: botServerData?.user || null,
      error: botServerData?.error || null,
      botConfig: user.botConfig ? (typeof user.botConfig === 'string' ? JSON.parse(user.botConfig) : user.botConfig) : null,
      stats: botServerData?.stats || {
        uptime: isConnected ? "En ligne" : "Arrêté",
        ping: "24ms",
        status: isConnected ? "En Ligne" : (user.activeSession ? "Connexion..." : "Déconnecté")
      },
      broadcast: botServerData?.broadcast || { status: 'idle', progress: 0 }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
