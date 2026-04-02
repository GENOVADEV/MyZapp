// src/app/api/whatsapp/disconnect/route.ts
import { NextResponse } from "next/server";
import { getUserIdFromToken } from "@/lib/auth";
import { disconnectWhatsApp } from "@/services/syncDB/userSyncService";
// On importe les fonctions et la mémoire de notre serveur unifié
import { getSessionIdForUser, sessions, cleanupSession } from "@/lib/server-ws"; 

export async function POST() {
  try {
    const userId = await getUserIdFromToken();

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // 1. Gérer la déconnexion réelle de WhatsApp (Baileys) en mémoire
    const sessionId = getSessionIdForUser(userId);
    
    if (sessionId) {
      const session = sessions.get(sessionId);
      
      // Si le socket est actif, on envoie l'ordre de déconnexion officiel aux serveurs WhatsApp
      if (session?.sock) {
        try {
          await session.sock.logout();
          console.log(`📱 Déconnexion WhatsApp envoyée pour l'utilisateur ${userId}`);
        } catch (err) {
          console.error("Erreur lors du logout Baileys:", err);
        }
      }
      
      // On détruit la session en RAM et on supprime le dossier "whatsapp_sessions/..." (le 'true' sert à ça)
      cleanupSession(sessionId, true);
    }

    // 2. Nettoyer la base de données via ton service existant
    await disconnectWhatsApp(userId);

    return NextResponse.json({ 
        success: true,
        message: "WhatsApp déconnecté et données nettoyées avec succès"
    });

  } catch (error) {
    console.error("Erreur API disconnect WhatsApp:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la déconnexion" }, { status: 500 });
  }
}