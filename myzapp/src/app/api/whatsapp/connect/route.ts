// src/app/api/whatsapp/connect/route.ts

import { NextResponse } from "next/server";
import { getWhatsAppManager } from "@/lib/websocket-server";

export async function POST(req: Request) {
  try {
    const { sessionId, method, phone } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
    }

    const manager = getWhatsAppManager();

    // Envoie l'ordre au WebSocket
    manager.initializeSession(sessionId, method, phone);

    return NextResponse.json({
      success: true,
      message: "Connexion WhatsApp lancée"
    });

  } catch (error) {
    console.error("Erreur connect WhatsApp:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}