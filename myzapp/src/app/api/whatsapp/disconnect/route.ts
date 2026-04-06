// src/app/api/whatsapp/disconnect/route.ts
import { NextResponse } from "next/server";
import { getUserIdFromToken } from "@/lib/auth";
import { disconnectWhatsApp } from "@/services/syncDB/userSyncService";
import { sessions, cleanupSession } from "@/lib/server-ws"; 
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const userId = await getUserIdFromToken();

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // 1. Chercher dynamiquement la session active de l'utilisateur dans la RAM
    let activeSessionId = null;
    let activeSession = null;

    for (const [id, session] of sessions.entries()) {
      if (session.realUserid === userId) {
        activeSessionId = id;
        activeSession = session;
        break;
      }
    }
    
    if (activeSessionId && activeSession) {
      // 2. Si le socket est actif, on envoie l'ordre de déconnexion officiel à WhatsApp
      if (activeSession.sock) {
        try {
          await activeSession.sock.logout();
          console.log(`📱 Déconnexion WhatsApp envoyée pour l'utilisateur ${userId}`);
        } catch (err) {
          console.error("Erreur lors du logout Baileys:", err);
        }
      }
      
      // 3. On détruit la session en RAM et on déclenche la purge de la BDD 
      // (Le paramètre 'true' et 'userId' disent à cleanupSession d'effacer les clés Prisma)
      await cleanupSession(activeSessionId, true, userId);
    }

    // 4. SÉCURITÉ ABSOLUE : Même si le serveur a redémarré (RAM vide), 
    // on force la suppression de toutes les clés cryptographiques de cet utilisateur dans la BDD.
    // await prisma.whatsAppSession.deleteMany({
    //   where: { userId: userId }
    // });
    console.log(`🧹 Clés cryptographiques purgées de la base de données pour ${userId}`);

    // 5. Nettoyer les statuts globaux via ton service existant
    await disconnectWhatsApp(userId);

    return NextResponse.json({ 
        success: true,
        message: "WhatsApp déconnecté et données nettoyées avec succès"
    });

  } catch (error) {
    console.error("❌ Erreur API disconnect WhatsApp:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la déconnexion" }, { status: 500 });
  }
}