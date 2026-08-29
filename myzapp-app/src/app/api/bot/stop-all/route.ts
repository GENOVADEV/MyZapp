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

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.activeSession) {
      return NextResponse.json({ error: "Aucun bot actif associé à ce compte." }, { status: 400 });
    }

    const botServerUrl = process.env.BOT_SERVER_URL || "https://myzapp-bot.onrender.com";
    try {
      await fetch(`${botServerUrl}/api/bot/stop-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: user.activeSession })
      });
    } catch (err) {
      console.warn("Could not notify bot server of stop-all:", err);
    }

    return NextResponse.json({
      success: true,
      message: "Toutes les diffusions, téléchargements et actions ont été immédiatement arrêtés."
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
