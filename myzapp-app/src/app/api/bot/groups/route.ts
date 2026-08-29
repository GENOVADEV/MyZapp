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

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.activeSession) {
      return NextResponse.json({ error: "Votre bot n'est pas connecté à WhatsApp." }, { status: 400 });
    }

    const botServerUrl = process.env.BOT_SERVER_URL || "https://myzapp-bot.onrender.com";
    const res = await fetch(`${botServerUrl}/api/bot/groups?session=${encodeURIComponent(user.activeSession)}`);
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Impossible de récupérer les groupes");
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
