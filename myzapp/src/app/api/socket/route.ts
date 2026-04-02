// src/app/api/data/messages/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    // 1. Vérifier l'authentification
    const user = await getUserFromToken();
    if (!user || !user.userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. Récupérer et valider les paramètres
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId requis" }, { status: 400 });
    }

    // 3. SÉCURITÉ : Vérifier que la conversation appartient bien à cet utilisateur
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId: true }
    });

    if (!conversation || conversation.userId !== user.userId) {
      return NextResponse.json(
        { error: "Conversation introuvable ou accès refusé" }, 
        { status: 403 }
      );
    }

    // 4. Exécuter les requêtes (Compte total + Messages)
    const [totalMessages, messages] = await prisma.$transaction([
      prisma.message.count({ where: { conversationId } }),
      
      prisma.message.findMany({
        where: { conversationId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" }, // Les plus récents en premier
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true, // Toujours utile d'avoir l'avatar pour le frontend
            }
          }
        }
      })
    ]);

    // 5. Calculer la pagination
    const totalPages = Math.ceil(totalMessages / limit);

    // 6. Renvoyer la donnée au format exact attendu par le hook
    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total: totalMessages,
        pages: totalPages,
      }
    });

  } catch (error) {
    console.error("❌ Erreur API Messages:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur lors de la récupération des messages" }, 
      { status: 500 }
    );
  }
}