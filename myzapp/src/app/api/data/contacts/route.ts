import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import {serializeBigInt} from '@/lib/serializer';


export async function GET(req: Request) {
  try {
    // 🔐 1. Auth
    const user = await getUserFromToken();
    if (!user || !user.userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 📦 2. Params
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const search = searchParams.get('search');
    const favorites = searchParams.get('favorites') === 'true';
    const blocked = searchParams.get('blocked') === 'true';

    // 🧠 3. Where dynamique
    const whereClause: any = {
      userId: user.userId,
    };

    if (blocked) {
      whereClause.isBlocked = true;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // ⚡ 4. Requêtes Prisma
    const [totalContacts, contacts] = await prisma.$transaction([
      prisma.contact.count({ where: whereClause }),

      prisma.contact.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },

        include: {
          contactUser: {
            select: {
              id: true,
              name: true,
              image: true,
              phone: true,
            }
          },
          conversations: {
            select: {
              id: true,
              lastMessageAt: true,
              unreadCount: true,
            }
          }
        }
      })
    ]);

    // 📊 5. Pagination
    const totalPages = Math.ceil(totalContacts / limit);

    // 🔥 6. Response SAFE (BigInt FIX)
    return NextResponse.json(
      serializeBigInt({
        contacts,
        pagination: {
          page,
          limit,
          total: totalContacts,
          pages: totalPages,
        }
      })
    );

  } catch (error) {
    console.error('❌ Erreur API Contacts:', error);

    return NextResponse.json(
      { error: "Erreur interne du serveur lors de la récupération des contacts" },
      { status: 500 }
    );
  }
}