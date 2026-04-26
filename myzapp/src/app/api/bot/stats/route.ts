import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    // 1. Vérification de la sécurité (Utilisateur connecté)
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // 2. Récupérer la session WhatsApp liée à cet utilisateur
    const appSession = await prisma.appWhatsAppSession.findFirst({
      where: { userId: userId }
    });

    // S'il n'a pas de bot connecté, on renvoie des stats à zéro
    if (!appSession) {
      return NextResponse.json({
        commands: { total: 0, today: 0 },
        filters: 0,
        antilinks: 0,
        warnings: 0,
        messages: { total: 0, text: 0, image: 0, video: 0, audio: 0, sticker: 0, other: 0 }
      });
    }

    const sessionId = appSession.sessionId;

    // 3. Date du jour pour les stats journalières
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 4. Exécuter toutes les requêtes Prisma en parallèle
    const [
      totalCommandsObj,
      todayCommandsObj,
      totalFilters,
      activeAntilinks,
      totalWarnings,
      messagesStatsObj // 👈 NOUVEAU : Récupération des stats de messages
    ] = await Promise.all([
      // A. Total des commandes
      prisma.botUsage.aggregate({
        where: { sessionId },
        _sum: { commandCount: true }
      }),

      // B. Commandes AUJOURD'HUI
      prisma.botUsage.aggregate({
        where: { 
          sessionId,
          date: { gte: startOfToday }
        },
        _sum: { commandCount: true }
      }),

      // C. Filtres
      prisma.filter.count({
        where: { enabled: true } 
      }),

      // D. Antiliens
      prisma.antilinkConfig.count({
        where: { enabled: true }
      }),

      // E. Avertissements
      prisma.warn.count(),

      // F. 🌟 NOUVEAU : Agrégation des UserStats
      prisma.userStats.aggregate({
        _sum: {
          totalMessages: true,
          textMessages: true,
          imageMessages: true,
          videoMessages: true,
          audioMessages: true,
          stickerMessages: true,
          otherMessages: true,
        }
      })
    ]);

    // 5. Formatage de la réponse finale
    const stats = {
      commands: {
        total: totalCommandsObj._sum.commandCount || 0,
        today: todayCommandsObj._sum.commandCount || 0
      },
      filters: totalFilters,
      antilinks: activeAntilinks,
      warnings: totalWarnings,
      // 👈 NOUVEAU : Bloc Messages pour le frontend
      messages: {
        total: messagesStatsObj._sum.totalMessages || 0,
        text: messagesStatsObj._sum.textMessages || 0,
        image: messagesStatsObj._sum.imageMessages || 0,
        video: messagesStatsObj._sum.videoMessages || 0,
        audio: messagesStatsObj._sum.audioMessages || 0,
        sticker: messagesStatsObj._sum.stickerMessages || 0,
        other: messagesStatsObj._sum.otherMessages || 0,
      }
    };

    return NextResponse.json(stats);

  } catch (error: any) {
    console.error("Erreur API Stats:", error);
    return NextResponse.json(
      { message: "Erreur lors de la récupération des statistiques" }, 
      { status: 500 }
    );
  }
}