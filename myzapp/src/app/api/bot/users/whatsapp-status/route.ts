// src/app/api/bot/user/whatsapp-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { UserSyncManager } from '@/services/syncDB/userSyncService';
import { getServerSession } from 'next-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const status = await UserSyncManager.getWhatsAppStatus(session.user.name);

    return NextResponse.json(status);
  } catch (error) {
    console.error('Erreur récupération statut WhatsApp:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du statut' },
      { status: 500 }
    );
  }
}
