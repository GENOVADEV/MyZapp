import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { ConversationManager } from "@/services/syncDB/conversationSyncService";

export async function GET(req: NextRequest) {
  const userId = await getUserFromToken();
  console.log("User ID from token:", userId);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 50);

  const conversations = await ConversationManager.getConversations(
    userId,
    undefined, // filters
    page,
    limit
  );
    console.log("conversations from API route:", conversations);

  return NextResponse.json(conversations);
}