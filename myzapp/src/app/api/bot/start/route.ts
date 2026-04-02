// src/app/api/bot/start/route.ts

import { NextResponse } from "next/server";
// 1. On importe directement la "Map" des sessions (la mémoire) depuis notre librairie
import { sessions } from "@/lib/server-ws"; 
import { syncContacts } from "@/services/syncDB/contactSyncService";
import { syncConversations } from "@/services/syncDB/conversationSyncService";

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();

    // 2. On pioche directement dans la mémoire globale pour trouver la session
    const session = sessions.get(sessionId);

    if (!session) {
      return NextResponse.json({ error: "Session non trouvée" }, { status: 404 });
    }

    if (!session.sock) {
      return NextResponse.json({ error: "WhatsApp n'est pas connecté pour cette session" }, { status: 400 });
    }

    // --- Ta logique métier pour démarrer le bot ici ---
    // (Par exemple, si c'est pour re-écouter les messages après un 'stop')
    // session.sock.ev.on('messages.upsert', ...) 

    return NextResponse.json({
      success: true,
      message: "Bot démarré avec succès"
    });

  } catch (error) {
    console.error("Erreur bot start:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}