// src/app/api/bot/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const RAGANORK_URL = process.env.RAGANORK_API_URL || "http://localhost:3001";
const BOT_API_SECRET = process.env.BOT_API_SECRET;

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
    }

    // 🌟 ASTUCE : On récupère le vrai ID via l'email de la session
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!dbUser) {
      return NextResponse.json({ message: "Utilisateur introuvable" }, { status: 404 });
    }

    const userId = dbUser.id;
    const { action, sessionId } = await req.json();

    if (!sessionId && action === "start") {
      return NextResponse.json({ message: "Session ID manquant" }, { status: 400 });
    }

    const fetchHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${BOT_API_SECRET}`
    };

    if (action === "start") {
      // 🌟 CORRECTION CRUCIALE : On nettoie l'ID pour ne pas créer de doublons dans la DB !
      const cleanSessionId = sessionId.replace('RGNK~', '');

      // On lance le bot avec l'ID propre
      const response = await fetch(`${RAGANORK_URL}/start-session`, {
        method: "POST",
        headers: fetchHeaders,
        body: JSON.stringify({ sessionId: cleanSessionId })
      });

      // 🟢 1. L'ASTUCE ANTI-CRASH : On crée la coquille vide avec l'ID PROPRE
      await prisma.whatsappSessions.upsert({
        where: { sessionId: cleanSessionId },
        update: {}, 
        create: {
          sessionId: cleanSessionId,
          sessionData: "", 
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // On tente de voir si le bot a déjà rempli des données (pour le botPhone)
      const rawSession = await prisma.whatsappSessions.findUnique({
        where: { sessionId: cleanSessionId }
      });

      let extractedBotPhone = null;

      // Extraction du numéro de téléphone
      if (rawSession && rawSession.sessionData) {
        try {
          const data = JSON.parse(rawSession.sessionData);
          if (data.me && data.me.id) {
            extractedBotPhone = data.me.id.split(':')[0].replace(/[^0-9]/g, '');
          }
        } catch (e) {
          console.error("Erreur de lecture des données du bot :", e);
        }
      }

      // 🟢 2. On crée l'enfant en le liant au BON sessionId propre
      await prisma.appWhatsAppSession.upsert({
        where: { id: sessionId }, // L'ID front-end reste avec RGNK~ (optionnel mais recommandé)
        update: { userId: userId, botPhone: extractedBotPhone, sessionId: cleanSessionId },
        create: { id: sessionId, sessionId: cleanSessionId, userId: userId, botPhone: extractedBotPhone }
      });

      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    if (action === "stop") {
      const appSession = await prisma.appWhatsAppSession.findFirst({
        where: { userId: dbUser.id.replace("bot_", "") }
      });

      const realSessionId = appSession ? appSession.sessionId.replace('RGNK~', '') : null;
      const response = await fetch(`${RAGANORK_URL}/stop-session`, {
        method: "POST",
        headers: fetchHeaders,
        body: JSON.stringify({ sessionId: realSessionId })
      });

      const data = await response.json();
      console.log("reponse Raganork:", data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json({ message: "Action inconnue" }, { status: 400 });

  } catch (error: any) {
    console.error("Erreur API Bot (POST):", error);
    return NextResponse.json({ message: "Erreur interne", details: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!dbUser) throw new Error("User not found");

    const appSession = await prisma.appWhatsAppSession.findFirst({
      where: { userId: dbUser.id.replace("bot_", "") }
    });

    if (!appSession) {
      return NextResponse.json({ status: "offline", message: "Aucune session liée" });
    }

    // 🌟 On utilise toujours l'ID propre pour les recherches
    const cleanSessionId = appSession.sessionId.replace('RGNK~', '');

    const response = await fetch(`${RAGANORK_URL}/status?sessionId=${cleanSessionId}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${BOT_API_SECRET}` }
    });

    if (!response.ok) {
      throw new Error("Raganork injoignable");
    }

    const data = await response.json();
    
    // 🟢 2. L'AUTO-RÉPARATION DU BOT PHONE
    if (data.status === "online" && !appSession.botPhone) {
      const rawSession = await prisma.whatsappSessions.findUnique({
        where: { sessionId: cleanSessionId }
      });

      if (rawSession && rawSession.sessionData) {
        try {
          const sessionDataParsed = JSON.parse(rawSession.sessionData);
          if (sessionDataParsed.me && sessionDataParsed.me.id) {
            const botPhone = sessionDataParsed.me.id.split(':')[0].replace(/[^0-9]/g, '');
            
            await prisma.appWhatsAppSession.update({
              where: { id: appSession.id },
              data: { botPhone: botPhone }
            });
            console.log("✅ Auto-réparation réussie : botPhone mis à jour avec", botPhone);
          }
        } catch (e) {
          console.error("Impossible de lire les données de session pour auto-réparer le botPhone");
        }
      }
    }
    
    return NextResponse.json({ ...data, sessionId: appSession.id }); // On renvoie l'ID frontend d'origine

  } catch (error: any) {
    return NextResponse.json({ status: "offline", message: "Moteur Raganork hors ligne" }, { status: 200 });
  }
}