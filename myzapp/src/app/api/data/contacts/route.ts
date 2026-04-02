// src/app/api/data/conversations/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    // 1. Vérifier l'authentification
    const user = await getUserFromToken();
    if (!user || !user.userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. Récupérer et parser les paramètres de l'URL
    const { searchParams } = new URL(req.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const search = searchParams.get('search');
    const unreadOnly = searchParams.get('unread') === 'true';

    // 3. Construire la requête Prisma (Filtres dynamiques)
    const whereClause: any = {
      userId: user.userId, // Sécurité : QUE les conversations de cet utilisateur
    };

    // Filtre pour les messages non lus
    if (unreadOnly) {
      whereClause.unreadCount = { gt: 0 };
    }

    // Recherche dans le nom ou le numéro du contact associé
    if (search) {
      whereClause.OR = [
        { contact: { name: { contains: search, mode: 'insensitive' } } },
        { contact: { phone: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // 4. Exécuter les requêtes en parallèle (Total + Données)
    const [totalConversations, conversations] = await prisma.$transaction([
      prisma.conversation.count({ where: whereClause }),
      
      prisma.conversation.findMany({
        where: whereClause,
        skip,
        take: limit,
        // Trier par date du dernier message (les plus récents en premier)
        orderBy: { lastMessageAt: 'desc' }, 
        // Inclure les informations du contact associé
        include: {
          contact: {
            select: { id: true, name: true, phone: true, avatar: true }
          }
        }
      })
    ]);

    // 5. Calculer les infos de pagination
    const totalPages = Math.ceil(totalConversations / limit);

    // 6. Renvoyer la réponse
    return NextResponse.json({
      conversations,
      pagination: {
        page,
        limit,
        total: totalConversations,
        pages: totalPages,
      }
    });

  } catch (error) {
    console.error('❌ Erreur API Conversations:', error);
    return NextResponse.json(
      { error: "Erreur interne du serveur lors de la récupération des conversations" },
      { status: 500 }
    );
  }
}