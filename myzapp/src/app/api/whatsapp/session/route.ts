// src/app/api/whatsapp/session/route.ts
import { NextResponse } from 'next/server';
import { getUserSessions } from '@/lib/server-ws'; // Import direct depuis notre serveur unifié
import { getUserFromToken } from '@/lib/auth';

export async function GET() {
  try {
    // 1. Authentification centralisée (plus propre que jwtVerify manuel)
    const user = await getUserFromToken();

    if (!user || !user.userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // 2. Récupérer les sessions depuis la mémoire RAM partagée
    const userSessions = getUserSessions(user.userId);

    // 3. Formater les données pour le frontend (sécurité: on ne renvoie pas les objets complexes comme 'socket' ou 'sock')
    const formattedSessions = userSessions.map(session => ({
      sessionId: session.socketId || 'offline', // ID pour le frontend
      status: session.status,
      method: session.method,
      phone: session.phone || null,
      createdAt: session.createdAt.toISOString(),
      lastConnectedAt: session.lastConnectedAt ? session.lastConnectedAt.toISOString() : null,
      metadata: session.metadata || {}
    }));

    return NextResponse.json({ 
        success: true,
        sessions: formattedSessions 
    });

  } catch (error: any) {
    console.error('❌ Erreur API fetching sessions:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des sessions' },
      { status: 500 }
    );
  }
}