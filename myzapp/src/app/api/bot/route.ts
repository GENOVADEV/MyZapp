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
      // On lance le bot
      const response = await fetch(`${RAGANORK_URL}/start-session`, {
        method: "POST",
        headers: fetchHeaders,
        body: JSON.stringify({ sessionId })
      });

      // 🟢 1. L'ASTUCE ANTI-CRASH (On crée le parent)
      // On s'assure que la table mère possède bien cet ID avant d'insérer l'enfant.
      await prisma.whatsappSessions.upsert({
        where: { sessionId: sessionId },
        update: {}, // S'il existe déjà, on ne touche à rien
        create: {
          sessionId: sessionId,
          sessionData: "", // Vide pour le moment, le bot le remplira
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // On tente de voir si le bot a déjà rempli des données (pour le botPhone)
      const rawSession = await prisma.whatsappSessions.findUnique({
        where: { sessionId: sessionId }
      });

      let extractedBotPhone = null;

      // Extraction du numéro de téléphone
      if (rawSession && rawSession.sessionData) {
        try {
          const data = JSON.parse(rawSession.sessionData);
          if (data.me && data.me.id) {
            // Transforme "237689123644:1@s.whatsapp.net" en "237689123644"
            extractedBotPhone = data.me.id.split(':')[0].replace(/[^0-9]/g, '');
          }
        } catch (e) {
          console.error("Erreur de lecture des données du bot :", e);
        }
      }

      // 🟢 2. On crée l'enfant en toute sécurité
      await prisma.appWhatsAppSession.upsert({
        where: { id: sessionId },
        update: { userId: userId, botPhone: extractedBotPhone },
        create: { id: sessionId, sessionId: sessionId, userId: userId, botPhone: extractedBotPhone }
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

    // 🌟 On cherche la session liée à cet utilisateur dans la base de données
    const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!dbUser) throw new Error("User not found");

    const appSession = await prisma.appWhatsAppSession.findFirst({
      where: { userId: dbUser.id.replace("bot_", "") }
    });

    // Si le user n'a pas encore lié de session Raganork, on le dit au front
    if (!appSession) {
      return NextResponse.json({ status: "offline", message: "Aucune session liée" });
    }

    const sessionId = appSession.sessionId.replace('RGNK~', '');

    // On vérifie sur Raganork si cette session tourne
    const response = await fetch(`${RAGANORK_URL}/status?sessionId=${sessionId}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${BOT_API_SECRET}` }
    });

    if (!response.ok) {
      throw new Error("Raganork injoignable");
    }

    const data = await response.json();
    // 🟢 2. L'AUTO-RÉPARATION DU BOT PHONE
    // Si le bot est "online" mais que botPhone est toujours null dans notre base, on le met à jour !
    if (data.status === "online" && !appSession.botPhone) {
      const rawSession = await prisma.whatsappSessions.findUnique({
        where: { sessionId: sessionId }
      });

      if (rawSession && rawSession.sessionData) {
        try {
          const sessionDataParsed = JSON.parse(rawSession.sessionData);
          if (sessionDataParsed.me && sessionDataParsed.me.id) {
            const botPhone = sessionDataParsed.me.id.split(':')[0].replace(/[^0-9]/g, '');
            
            // On met à jour la base de données !
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
    // On renvoie le statut + l'ID de session pour le Front
    console.log("Statut Raganork:", data);
    return NextResponse.json({ ...data, sessionId });

  } catch (error: any) {
    // Si Raganork est éteint, on ne crash pas, on dit juste que c'est hors ligne
    return NextResponse.json({ status: "offline", message: "Moteur Raganork hors ligne" }, { status: 200 });
  }
}