// src/app/api/whatsapp/status/route.ts
import { NextResponse } from "next/server";
import { getUserIdFromToken } from "@/lib/auth";
import { getWhatsAppStatus } from "@/services/syncDB/userSyncService";
import { sessions } from "@/lib/server-ws"; // On importe juste la mémoire en temps réel

export async function GET() {
  try {
    const userId = await getUserIdFromToken();

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // 1. Récupérer l'état persistant depuis la base de données
    const dbStatus = await getWhatsAppStatus(userId);

    // 2. Chercher dynamiquement la session exacte de l'utilisateur dans la RAM
    let sessionData = null;
    let activeSessionId = null;

    // On parcourt toutes les sessions actives en mémoire pour trouver celle de ce userId
    for (const [id, session] of sessions.entries()) {
      if (session.realUserid === userId) {
        activeSessionId = id;
        sessionData = session;
        break; // On a trouvé, on arrête la boucle
      }
    }

    let realtimeStatus = 'disconnected';
    let isOnline = false;

    if (sessionData) {
      realtimeStatus = sessionData.status;
      isOnline = sessionData.status === 'connected';
    }

    // 3. Fusionner les deux informations pour le frontend
    const enhancedStatus = {
      ...dbStatus, // Contient: connected, whatsappId, lastSync, phone, activeDevice...
      realtimeStatus: realtimeStatus, // ex: 'reconnecting', 'qr_pending', 'connected'
      isOnline: isOnline,
      sessionId: activeSessionId, // C'est toujours très pratique de renvoyer ça au frontend !
      
      // Si la RAM dit qu'on n'est pas connecté mais que la DB oui, la RAM a toujours raison pour le "status" actuel
      status: isOnline ? 'connected' : (realtimeStatus !== 'disconnected' ? realtimeStatus : 'disconnected')
    };

    return NextResponse.json(enhancedStatus);

  } catch (error) {
    console.error("❌ Erreur API fetching WhatsApp status:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la récupération du statut" }, { status: 500 });
  }
}