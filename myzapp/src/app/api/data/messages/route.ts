// src/app/api/data/messages/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const conversationId = searchParams.get("conversationId");
  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 50);

  if (!conversationId) {
    return NextResponse.json({ error: "conversationId requis" }, { status: 400 });
  }

  const skip = (page - 1) * limit;

  try {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json(messages);

  } catch (error) {
    return NextResponse.json({ error: "Erreur messages" }, { status: 500 });
  }
}