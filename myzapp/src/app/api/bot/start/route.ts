// src/app/api/bot/start/route.ts

import { NextResponse } from "next/server";
import { getWhatsAppManager } from "@/lib/websocket-server";
import { syncContacts } from "@/services/syncDB/contactSyncService";
import { syncConversations } from "@/services/syncDB/conversationSyncService";

export async function POST(req: Request) {
  try {
    const { sessionId, userId } = await req.json();

    if (!sessionId || !userId) {
      return NextResponse.json({ error: "sessionId et userId requis" }, { status: 400 });
    }

    const manager = getWhatsAppManager();
    const sessionManager = manager.getSessionManager();
    const session = sessionManager.getSession(sessionId);

    if (!session || !session.sock) {
      return NextResponse.json({ error: "Session invalide" }, { status: 400 });
    }

    const sock = session.sock;

    // 📥 Sync contacts
    sock.ev.on("contacts.upsert", async (contacts: any[]) => {
      await syncContacts(contacts, userId);
    });

    // 💬 Sync conversations
    sock.ev.on("chats.upsert", async (chats: any[]) => {
      await syncConversations(chats, userId);
    });

    return NextResponse.json({
      success: true,
      message: "Bot démarré avec sync actif"
    });

  } catch (error) {
    console.error("Erreur bot start:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}