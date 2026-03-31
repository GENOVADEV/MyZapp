// src/app/api/whatsapp/disconnect/route.ts
import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { UserSyncManager } from "@/services/syncDB/userSyncService";

export async function POST() {
  const userId = await getUserFromToken();

  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  await UserSyncManager.disconnectWhatsApp(userId);

  return NextResponse.json({ success: true });
}