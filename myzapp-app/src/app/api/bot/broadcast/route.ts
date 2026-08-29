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

    const body = await req.json();
    const { action = "start", message: textMessage, targets, mode = "business" } = body;

    const botServerUrl = process.env.BOT_SERVER_URL || "https://myzapp-bot.onrender.com";
    let endpoint = "/api/bot/broadcast/start";
    if (action === "pause") endpoint = "/api/bot/broadcast/pause";
    if (action === "resume") endpoint = "/api/bot/broadcast/resume";
    if (action === "stop") endpoint = "/api/bot/broadcast/stop";

    const res = await fetch(`${botServerUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: user.activeSession,
        message: textMessage,
        targets,
        mode
      })
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error || "Erreur lors de la diffusion." }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.activeSession) {
      return NextResponse.json({ state: { status: 'idle', progress: 0 } });
    }

    const botServerUrl = process.env.BOT_SERVER_URL || "https://myzapp-bot.onrender.com";
    const res = await fetch(`${botServerUrl}/api/bot/broadcast/status?session=${encodeURIComponent(user.activeSession)}`);
    const data = await res.json();

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
