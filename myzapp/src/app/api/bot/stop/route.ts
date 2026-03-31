// src/app/api/bot/stop/route.ts

import { NextResponse } from "next/server";
import { getWhatsAppManager } from "@/lib/websocket-server";

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();

    const manager = getWhatsAppManager();
    const sessionManager = manager.getSessionManager();
    const session = sessionManager.getSession(sessionId);

    if (!session) {
      return NextResponse.json({ error: "Session non trouvée" }, { status: 404 });
    }

    // ⚠️ enlever tous les listeners
    session.sock?.ev.removeAllListeners(sessionId);

    return NextResponse.json({
      success: true,
      message: "Bot arrêté"
    });

  } catch (error) {
    console.error("Erreur bot stop:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}