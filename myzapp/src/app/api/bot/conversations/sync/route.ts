// src/app/api/bot/conversations/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { syncConversations } from '@/services/syncDB/conversationSyncService';
import { getServerSession } from 'next-auth';

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession();
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { conversations } = await request.json();
    
    if (!conversations || !Array.isArray(conversations)) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }

    // Synchroniser les conversations
    const result = await syncConversations(conversations, session.user.name);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur synchronisation conversations:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la synchronisation' },
      { status: 500 }
    );
  }
}
