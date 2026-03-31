// src/app/api/whatsapp/status/route.ts
import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { UserSyncManager } from "@/services/syncDB/userSyncService";

export async function GET() {
  const userId = await getUserFromToken();

  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const status = await UserSyncManager.getWhatsAppStatus(userId);
  console.log("status from API route:", status);

  return NextResponse.json(status);
}