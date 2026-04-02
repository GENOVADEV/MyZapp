// src/app/api/data/contacts/sync/route.ts
import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth'; // Ajuste le chemin vers ta fonction d'auth
import { syncContacts } from '@/services/syncDB/contactSyncService'; // Ajuste le chemin

export async function POST(req: Request) {
  try {
    // 1. Vérifier l'authentification
    const user = await getUserFromToken();
    if (!user || !user.userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. Récupérer le corps de la requête
    const body = await req.json();
    const { contacts } = body;

    // 3. Valider les données entrantes
    if (!contacts || !Array.isArray(contacts)) {
      return NextResponse.json(
        { error: "Format de données invalide. Un tableau 'contacts' est attendu." }, 
        { status: 400 }
      );
    }

    if (contacts.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        errors: [],
        stats: { total: 0, created: 0, updated: 0, skipped: 0, failed: 0 }
      });
    }

    // 4. Lancer le service de synchronisation
    const syncResult = await syncContacts(contacts, user.userId);

    // 5. Renvoyer le résultat exact attendu par le hook
    return NextResponse.json(syncResult);

  } catch (error) {
    console.error('❌ Erreur API Sync Contacts:', error);
    return NextResponse.json(
      { error: "Erreur interne du serveur lors de la synchronisation des contacts" },
      { status: 500 }
    );
  }
}