// src/app/api/bot/stop/route.ts

import { NextResponse } from "next/server";
import { sessions } from "@/lib/server-ws";

export async function POST(req: Request) {
  try {

    if (!sessions) {
      return NextResponse.json({ error: "Session non trouvée" }, { status: 404 });
    }

      // --- Ta logique métier pour arrêter le bot ici ---
    return NextResponse.json({
      success: true,
      message: "Bot arrêté"
    });

  } catch (error) {
    console.error("Erreur bot stop:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}