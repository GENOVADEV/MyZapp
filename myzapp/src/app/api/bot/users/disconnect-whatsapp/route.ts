// src/app/api/bot/user/disconnect-whatsapp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { UserSyncManager } from '@/services/syncDB/userSyncService';
import { getServerSession } from 'next-auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const result = await UserSyncManager.disconnectWhatsApp(session.user.name);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur déconnexion WhatsApp:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la déconnexion' },
      { status: 500 }
    );
  }
}
