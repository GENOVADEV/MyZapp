// src/app/api/data/conversations/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const user = await getUserFromToken();
    if (!user || !user.userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const search = searchParams.get('search');
    const type = searchParams.get('type');
    const unread = searchParams.get('unread') === 'true';

    // Construction dynamique du filtre
    const whereClause: any = { userId: user.userId };

    if (type) whereClause.type = type;
    if (unread) whereClause.unreadCount = { gt: 0 };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contact: { name: { contains: search, mode: 'insensitive' } } },
        { group: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Récupération avec pagination
    const [totalConversations, conversations] = await prisma.$transaction([
      prisma.conversation.count({ where: whereClause }),
      prisma.conversation.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          contact: { select: { id: true, name: true, phone: true, avatar: true } },
          group: { select: { id: true, name: true, avatar: true } }
        }
      })
    ]);

    const totalPages = Math.ceil(totalConversations / limit);
    console.log(`Fetched conversations for user ${user.userId}: page ${page}/${totalPages}, total ${totalConversations}`);

    // Structure exacte attendue par ton hook
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
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}