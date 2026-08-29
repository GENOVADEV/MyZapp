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
      return NextResponse.json({ error: "Votre bot n'est pas connecté à WhatsApp." }, { status: 400 });
    }

    const { url, format = "video", quality = "720p" } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URL de média manquante." }, { status: 400 });
    }

    const botServerUrl = process.env.BOT_SERVER_URL || "https://myzapp-bot.onrender.com";
    const res = await fetch(`${botServerUrl}/api/bot/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: user.activeSession,
        url,
        format,
        quality
      })
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error || "Échec du téléchargement" }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
