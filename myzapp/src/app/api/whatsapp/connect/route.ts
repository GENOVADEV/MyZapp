// src/app/api/whatsapp/connect/route.ts
import { NextResponse } from "next/server";
import { getUserFromToken } from '@/lib/auth';
// BINGO ! On importe directement la fonction de notre librairie unifiée
import { initializeWhatsAppSession } from '@/lib/server-ws'; 

export async function POST(req: Request) {
  try {
    // 1. Récupérer l'utilisateur courant
    const user = await getUserFromToken();
    if (!user || !user.userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { sessionId, method = "qr", phone } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
    }

    // 2. Création d'un faux socket pour passer les infos (IP, User-Agent)
    // Le VRAI socket sera rattaché automatiquement quand le frontend se connectera via WS
    const fakeSocket = {
        handshake: {
            headers: {
                'x-forwarded-for': req.headers.get('x-forwarded-for') || '',
                'user-agent': req.headers.get('user-agent') || 'API Route'
            },
            address: ''
        },
        emit: () => {} // Fonction vide pour éviter les crashs
    };

    // 3. On lance l'initialisation DIRECTEMENT en mémoire (sans 'await' pour ne pas bloquer la réponse HTTP)
    initializeWhatsAppSession(fakeSocket, sessionId, method, phone, user.userId)
        .catch(err => console.error("❌ Erreur init WhatsApp en arrière-plan:", err));

    // 4. On répond tout de suite au frontend
    return NextResponse.json({
      success: true,
      message: "Ordre de connexion WhatsApp démarré avec succès"
    });

  } catch (error) {
    console.error("Erreur connect WhatsApp API:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}