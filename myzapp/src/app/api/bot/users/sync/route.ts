// src/app/api/bot/user/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { syncUserData } from '@/services/syncDB/userSyncService';
import { getServerSession } from 'next-auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { user: whatsappUser } = await request.json();
    
    if (!whatsappUser) {
      return NextResponse.json({ error: 'Données utilisateur manquantes' }, { status: 400 });
    }

    const result = await syncUserData(whatsappUser, session.user.name);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur synchronisation utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la synchronisation' },
      { status: 500 }
    );
  }
}