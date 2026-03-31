// src/app/api/data/contacts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { ContactManager } from "@/services/syncDB/contactSyncService";

const ContactService = ContactManager;
export async function GET(req: NextRequest) {
  const userId = await getUserFromToken();
  console.log("User ID from token:", userId);
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 50);
  const query = searchParams.get("q") || "";

  const contacts = await ContactService.searchContacts(userId, query, page, limit);
  console.log("contacts from API route:", contacts);
  return NextResponse.json(contacts);
}