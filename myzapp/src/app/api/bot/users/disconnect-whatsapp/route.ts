// src/app/api/bot/users/disconnect-whatsapp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { UserSyncManager } from '@/services/syncDB/userSyncService';
import { getServerSession } from 'next-auth';
import { useAuth } from '@/contexts/AuthContext';

export async function POST(request: NextRequest) {
  const { user: authUser } = useAuth();
  const userId = authUser?.id;
  try {
    const session = await getServerSession();
    if (userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const result = await UserSyncManager.disconnectWhatsApp(userId || '');

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur déconnexion WhatsApp:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la déconnexion' },
      { status: 500 }
    );
  }
}
