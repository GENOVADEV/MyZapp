// src/app/api/bot/users/whatsapp-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { UserSyncManager } from '@/services/syncDB/userSyncService';
import { useAuth } from '@/contexts/AuthContext';

export async function GET(request: NextRequest) {
  const { user: authUser } = useAuth();
  const userId = authUser?.id;
  try {
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const status = await UserSyncManager.getWhatsAppStatus(userId);

    return NextResponse.json(status);
  } catch (error) {
    console.error('Erreur récupération statut WhatsApp:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du statut' },
      { status: 500 }
    );
  }
}
