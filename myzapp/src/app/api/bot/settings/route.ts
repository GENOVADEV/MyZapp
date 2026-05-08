// src/app/api/bot/settings/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 🟢 1. LECTURE DES RÉGLAGES (Pour afficher sur le Dashboard)
export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!dbUser) return NextResponse.json({ message: "Utilisateur introuvable" }, { status: 404 });

    // On cherche la session du bot liée à cet utilisateur
    // (J'ai gardé le .replace comme dans tes autres routes pour être sûr)
    const appSession = await prisma.appWhatsAppSession.findFirst({
      where: { userId: dbUser.id.replace("bot_", "") },
      include: {
        globalSettings: true,
        aiPrompts: true,
        groupSettings: true
      }
    });

    if (!appSession) {
      return NextResponse.json({ message: "Aucun bot lié" }, { status: 404 });
    }

    // On renvoie les réglages. S'ils n'existent pas encore en DB, on renvoie des objets vides
    return NextResponse.json({
      globalSettings: appSession.globalSettings || {},
      aiPrompts: appSession.aiPrompts || {},
      groupSettings: appSession.groupSettings || []
    }, { status: 200 });

  } catch (error: any) {
    console.error("Erreur GET Settings:", error);
    return NextResponse.json({ message: "Erreur serveur", details: error.message }, { status: 500 });
  }
}


// 🟢 2. SAUVEGARDE DES RÉGLAGES (Quand l'utilisateur clique sur Enregistrer)
export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!dbUser) return NextResponse.json({ message: "Utilisateur introuvable" }, { status: 404 });

    const appSession = await prisma.appWhatsAppSession.findFirst({
      where: { userId: dbUser.id.replace("bot_", "") }
    });

    if (!appSession) {
      return NextResponse.json({ message: "Aucun bot lié" }, { status: 404 });
    }

    // On récupère ce que le Frontend nous envoie
    const body = await req.json();
    const { type, data } = body; 

    // L'astuce "upsert" : Met à jour si ça existe, sinon le crée (très utile pour la première fois !)
    
    // --- TYPE 1 : RÉGLAGES GÉNERAUX ---
    if (type === 'global') {
      const updated = await prisma.botGlobalSettings.upsert({
        where: { appSessionId: appSession.id },
        update: data,
        create: { ...data, appSessionId: appSession.id }
      });
      return NextResponse.json({ message: "Réglages globaux mis à jour", data: updated });
    }

    // --- TYPE 2 : INTELLIGENCE ARTIFICIELLE ---
    if (type === 'ai') {
      const updated = await prisma.aIPrompts.upsert({
        where: { appSessionId: appSession.id },
        update: data,
        create: { ...data, appSessionId: appSession.id }
      });
      return NextResponse.json({ message: "Réglages IA mis à jour", data: updated });
    }

    // --- TYPE 3 : RÉGLAGES D'UN GROUPE ---
    if (type === 'group') {
      const { groupId, ...groupData } = data;
      if (!groupId) return NextResponse.json({ message: "L'ID du groupe est manquant" }, { status: 400 });

      const updated = await prisma.groupSettings.upsert({
        // On utilise la contrainte unique composée qu'on a créée dans schema.prisma
        where: { 
          appSessionId_groupId: { appSessionId: appSession.id, groupId: groupId } 
        },
        update: groupData,
        create: { ...groupData, appSessionId: appSession.id, groupId: groupId }
      });
      return NextResponse.json({ message: "Réglages de groupe mis à jour", data: updated });
    }

    return NextResponse.json({ message: "Type de réglage inconnu" }, { status: 400 });

  } catch (error: any) {
    console.error("Erreur POST Settings:", error);
    return NextResponse.json({ message: "Erreur serveur", details: error.message }, { status: 500 });
  }
}