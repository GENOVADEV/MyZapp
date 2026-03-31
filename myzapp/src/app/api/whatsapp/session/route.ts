// src/app/api/whatsapp/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppManager } from '@/lib/websocket-server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

// Types
interface CreateSessionRequest {
  method?: 'qr' | 'phone';
  phone?: string;
  metadata?: {
    device?: string;
    browser?: string;
    ip?: string;
  };
}

interface SessionResponse {
  sessionId: string;
  wsUrl: string;
  expiresAt: number;
  status: 'pending' | 'active' | 'connected' | 'error';
}

// JWT Secret (à mettre dans .env)
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * GET - Récupérer les sessions actives de l'utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    // Authentification via cookie JWT
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Vérifier le JWT
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET)
    );

    const userId = payload.userId as string;
    const whatsappManager = getWhatsAppManager();

    // Récupérer les sessions de l'utilisateur
    const userSessions = whatsappManager.getUserSessions(userId);

    const sessions = userSessions.map(session => ({
      sessionId: session.socketId, // Note: socketId est utilisé comme sessionId temporaire
      status: session.status,
      createdAt: session.createdAt.toISOString(),
      lastActivity: session.lastActivity.toISOString(),
      metadata: session.metadata
    }));

    return NextResponse.json({ sessions });
  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des sessions' },
      { status: 500 }
    );
  }
}

/**
 * POST - Créer une nouvelle session WebSocket
 */
export async function POST(request: NextRequest) {
  try {
    let body: CreateSessionRequest = { method: "qr" };

    try {
      body = await request.json();
    } catch {
      console.warn("⚠️ Aucun body reçu, fallback utilisé");
    } const { method = 'qr', phone, metadata = {} } = body;

    // Authentification
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let userId: string | undefined;

    if (token) {
      try {
        const { payload } = await jwtVerify(
          token,
          new TextEncoder().encode(JWT_SECRET)
        );
        userId = payload.userId as string;
      } catch (jwtError) {
        // Token invalide, continuer sans userId (session anonyme)
        console.warn('JWT invalide, session anonyme créée');
      }
    }

    // Générer un ID de session unique
    const sessionId = generateSessionId();

    // Ajouter l'IP réelle si disponible
    const clientIp = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const enhancedMetadata = {
      ...metadata,
      ip: clientIp,
      userAgent: request.headers.get('user-agent'),
      createdAt: new Date().toISOString()
    };

    // Note: Dans cette architecture, la session WebSocket réelle 
    // sera créée quand le client se connectera via WebSocket
    // Pour l'instant, on retourne juste les infos de connexion

    const expiresAt = Date.now() + (30 * 60 * 1000); // 30 minutes

    const response: SessionResponse = {
      sessionId,
      wsUrl: getWebSocketUrl(),
      expiresAt,
      status: 'pending'
    };

    // Stocker la session en mémoire (optionnel)
    // Dans une vraie app, utiliser Redis ou base de données
    storeSessionInMemory(sessionId, {
      userId,
      method,
      phone,
      metadata: enhancedMetadata,
      createdAt: new Date(),
      status: 'pending'
    });

    console.log(`📝 Nouvelle session créée: ${sessionId} pour ${userId || 'anonymous'}`);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: error || 'Erreur lors de la création de la session' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Supprimer une session
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId requis' },
        { status: 400 }
      );
    }

    const whatsappManager = getWhatsAppManager();

    // Vérifier si l'utilisateur a le droit de supprimer cette session
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (token) {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(JWT_SECRET)
      );
      const userId = payload.userId as string;

      // Vérifier que la session appartient à l'utilisateur
      const userSessions = whatsappManager.getUserSessions(userId);
      const canDelete = userSessions.some(s => s.socketId === sessionId);

      if (!canDelete) {
        return NextResponse.json(
          { error: 'Non autorisé' },
          { status: 403 }
        );
      }
    }

    // Supprimer la session
    whatsappManager.disconnectSession(sessionId);

    // Nettoyer de la mémoire
    deleteSessionFromMemory(sessionId);

    console.log(`🗑️ Session supprimée: ${sessionId}`);

    return NextResponse.json({
      success: true,
      message: 'Session supprimée'
    });
  } catch (error: any) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la session' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getWebSocketUrl(): string {
  if (process.env.NODE_ENV === 'production') {
    const protocol = process.env.NEXT_PUBLIC_APP_URL?.startsWith('https') ? 'wss' : 'ws';
    const host = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '');
    return `${protocol}://${host}/socket.io/`;
  }
  return 'ws://localhost:3001/socket.io/';
}

// Stockage temporaire en mémoire (à remplacer par Redis en production)
const memoryStore = new Map();

function storeSessionInMemory(sessionId: string, data: any) {
  memoryStore.set(sessionId, {
    ...data,
    lastAccessed: Date.now()
  });

  // Nettoyage automatique des sessions expirées
  setTimeout(() => {
    if (memoryStore.has(sessionId)) {
      const session = memoryStore.get(sessionId);
      if (Date.now() - session.lastAccessed > 30 * 60 * 1000) {
        memoryStore.delete(sessionId);
      }
    }
  }, 31 * 60 * 1000); // 31 minutes
}

function deleteSessionFromMemory(sessionId: string) {
  memoryStore.delete(sessionId);
}

export function getSessionFromMemory(sessionId: string) {
  const session = memoryStore.get(sessionId);
  if (session) {
    session.lastAccessed = Date.now();
  }
  return session;
}
