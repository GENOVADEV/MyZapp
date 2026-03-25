// src/app/api/bot/users/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { syncUserData } from '@/services/syncDB/userSyncService';
import { useAuth } from '@/contexts/AuthContext';

export async function POST(request: NextRequest) {
  const { user: authUser } = useAuth();
  const userId = authUser?.id;
  try {
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { user: whatsappUser } = await request.json();

    if (!whatsappUser) {
      return NextResponse.json({ error: 'Données utilisateur manquantes' }, { status: 400 });
    }

    const result = await syncUserData(whatsappUser, userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur synchronisation utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la synchronisation' },
      { status: 500 }
    );
  }
}