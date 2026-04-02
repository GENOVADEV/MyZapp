// src/services/syncDB/runSyncSequence.ts
import type { WASocket } from '@whiskeysockets/baileys';
import { syncUserData } from './userSyncService';
import { syncContacts } from './contactSyncService';
import { syncConversations } from './conversationSyncService';
import { syncMessages } from './messageSyncService';
import { syncGroups } from './groupSyncService';

interface SyncProgress {
  type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  message?: string;
  synced?: number;
  total?: number;
  percentage?: number;
}

/**
 * Fonction d'émission vers le client
 */
type EmitFunction = (sessionId: string, event: string, data: any) => void;

/**
 * Séquence complète de synchronisation WhatsApp → DB
 */
export async function runSyncSequence(
  socket: any,
  sessionId: string,
  sock: WASocket,
  realUserid: string,
  emitToSession: EmitFunction
): Promise<void> {
  console.log(`🔄 [${sessionId}] Début de la synchronisation complète`);

  const startTime = Date.now();
  const syncStats = {
    user: { success: false, synced: 0 },
    contacts: { success: false, synced: 0 },
    groups: { success: false, synced: 0 },
    conversations: { success: false, synced: 0 },
    messages: { success: false, synced: 0 },
  };

  // ============================================================================
  // 1. SYNCHRONISATION UTILISATEUR
  // ============================================================================
  try {
    emitToSession(sessionId, 'sync_progress', {
      type: 'user',
      status: 'in_progress',
      message: 'Synchronisation du profil...',
      percentage: 0,
    });

    if (sock.user) {
      const userResult = await syncUserData(sock.user as any, realUserid);

      if (userResult.success) {
        syncStats.user.success = true;
        syncStats.user.synced = 1;

        emitToSession(sessionId, 'sync_progress', {
          type: 'user',
          status: 'completed',
          message: 'Profil synchronisé',
          percentage: 100,
          details: userResult.stats,
        });

        console.log(`👤 [${sessionId}] Profil synchronisé`);
      } else {
        throw new Error(userResult.errors.join(', '));
      }
    }
  } catch (error) {
    console.error(`❌ [${sessionId}] Erreur sync utilisateur:`, error);
    emitToSession(sessionId, 'sync_progress', {
      type: 'user',
      status: 'error',
      message: 'Erreur synchronisation profil',
      error: String(error),
    });
  }

  // ============================================================================
  // 2. SYNCHRONISATION CONTACTS
  // ============================================================================
  try {
    emitToSession(sessionId, 'sync_progress', {
      type: 'contacts',
      status: 'in_progress',
      message: 'Récupération des contacts...',
      percentage: 0,
    });

    console.log(`📇 [${sessionId}] Récupération des contacts WhatsApp...`);

    // Récupérer tous les contacts
    const contacts = await (sock as any).store?.contacts || {};
    const contactsArray = Object.values(contacts);

    console.log(`📇 [${sessionId}] ${contactsArray.length} contacts trouvés`);

    if (contactsArray.length > 0) {
      // Synchroniser par lots de 50
      const batchSize = 50;
      let processedCount = 0;

      for (let i = 0; i < contactsArray.length; i += batchSize) {
        const batch = contactsArray.slice(i, i + batchSize);
        const contactResult = await syncContacts(batch as any, realUserid);

        processedCount += batch.length;
        const percentage = Math.round((processedCount / contactsArray.length) * 100);

        emitToSession(sessionId, 'sync_progress', {
          type: 'contacts',
          status: 'in_progress',
          message: `Synchronisation contacts: ${processedCount}/${contactsArray.length}`,
          synced: processedCount,
          total: contactsArray.length,
          percentage,
        });

        if (contactResult.success) {
          syncStats.contacts.synced += contactResult.synced;
        }
      }

      syncStats.contacts.success = true;

      emitToSession(sessionId, 'sync_progress', {
        type: 'contacts',
        status: 'completed',
        message: `${syncStats.contacts.synced} contacts synchronisés`,
        synced: syncStats.contacts.synced,
        total: contactsArray.length,
        percentage: 100,
      });

      console.log(`📇 [${sessionId}] ${syncStats.contacts.synced} contacts synchronisés`);
    } else {
      emitToSession(sessionId, 'sync_progress', {
        type: 'contacts',
        status: 'completed',
        message: 'Aucun contact à synchroniser',
        percentage: 100,
      });
    }
  } catch (error) {
    console.error(`❌ [${sessionId}] Erreur sync contacts:`, error);
    emitToSession(sessionId, 'sync_progress', {
      type: 'contacts',
      status: 'error',
      message: 'Erreur synchronisation contacts',
      error: String(error),
    });
  }

  // ============================================================================
  // 3. SYNCHRONISATION GROUPES
  // ============================================================================
  try {
    emitToSession(sessionId, 'sync_progress', {
      type: 'groups',
      status: 'in_progress',
      message: 'Récupération des groupes...',
      percentage: 0,
    });

    console.log(`👥 [${sessionId}] Récupération des groupes WhatsApp...`);

    // Récupérer tous les groupes
    const groups = await sock.groupFetchAllParticipating();
    const groupsArray = Object.values(groups);

    console.log(`👥 [${sessionId}] ${groupsArray.length} groupes trouvés`);

    if (groupsArray.length > 0) {
      const groupResult = await syncGroups(groupsArray as any, realUserid);

      syncStats.groups.success = groupResult.success;
      syncStats.groups.synced = groupResult.synced;

      emitToSession(sessionId, 'sync_progress', {
        type: 'groups',
        status: 'completed',
        message: `${groupResult.synced} groupes synchronisés`,
        synced: groupResult.synced,
        total: groupResult.stats.total,
        percentage: 100,
      });

      console.log(`👥 [${sessionId}] ${groupResult.synced} groupes synchronisés`);
    } else {
      emitToSession(sessionId, 'sync_progress', {
        type: 'groups',
        status: 'completed',
        message: 'Aucun groupe à synchroniser',
        percentage: 100,
      });
    }
  } catch (error) {
    console.error(`❌ [${sessionId}] Erreur sync groupes:`, error);
    emitToSession(sessionId, 'sync_progress', {
      type: 'groups',
      status: 'error',
      message: 'Erreur synchronisation groupes',
      error: String(error),
    });
  }

  // ============================================================================
  // 4. SYNCHRONISATION CONVERSATIONS
  // ============================================================================
  try {
    emitToSession(sessionId, 'sync_progress', {
      type: 'conversations',
      status: 'in_progress',
      message: 'Récupération des conversations...',
      percentage: 0,
    });

    console.log(`💬 [${sessionId}] Récupération des conversations WhatsApp...`);

    // Récupérer toutes les conversations
    const chats = await (sock as any).store?.chats || {};
    const chatsArray = Object.values(chats);

    console.log(`💬 [${sessionId}] ${chatsArray.length} conversations trouvées`);

    if (chatsArray.length > 0) {
      const conversationResult = await syncConversations(
        chatsArray as any,
        realUserid
      );

      syncStats.conversations.success = conversationResult.success;
      syncStats.conversations.synced = conversationResult.synced;

      emitToSession(sessionId, 'sync_progress', {
        type: 'conversations',
        status: 'completed',
        message: `${conversationResult.synced} conversations synchronisées`,
        synced: conversationResult.synced,
        total: conversationResult.stats.total,
        percentage: 100,
      });

      console.log(
        `💬 [${sessionId}] ${conversationResult.synced} conversations synchronisées`
      );
    } else {
      emitToSession(sessionId, 'sync_progress', {
        type: 'conversations',
        status: 'completed',
        message: 'Aucune conversation à synchroniser',
        percentage: 100,
      });
    }
  } catch (error) {
    console.error(`❌ [${sessionId}] Erreur sync conversations:`, error);
    emitToSession(sessionId, 'sync_progress', {
      type: 'conversations',
      status: 'error',
      message: 'Erreur synchronisation conversations',
      error: String(error),
    });
  }

  // ============================================================================
  // 5. SYNCHRONISATION MESSAGES RÉCENTS (optionnel)
  // ============================================================================
  try {
    emitToSession(sessionId, 'sync_progress', {
      type: 'messages',
      status: 'in_progress',
      message: 'Synchronisation messages récents...',
      percentage: 0,
    });

    console.log(`📨 [${sessionId}] Synchronisation messages récents...`);

    // Récupérer les messages récents de chaque conversation
    const messages = await (sock as any).store?.messages || {};
    const messagesArray = Object.values(messages).flat();

    console.log(`📨 [${sessionId}] ${messagesArray.length} messages trouvés`);

    if (messagesArray.length > 0) {
      // Limiter aux 1000 messages les plus récents pour éviter la surcharge
      const recentMessages = messagesArray.slice(0, 1000);

      const messageResult = await syncMessages(recentMessages as any, realUserid);

      syncStats.messages.success = messageResult.success;
      syncStats.messages.synced = messageResult.synced;

      emitToSession(sessionId, 'sync_progress', {
        type: 'messages',
        status: 'completed',
        message: `${messageResult.synced} messages synchronisés`,
        synced: messageResult.synced,
        total: messageResult.stats.total,
        percentage: 100,
      });

      console.log(`📨 [${sessionId}] ${messageResult.synced} messages synchronisés`);
    } else {
      emitToSession(sessionId, 'sync_progress', {
        type: 'messages',
        status: 'completed',
        message: 'Aucun message à synchroniser',
        percentage: 100,
      });
    }
  } catch (error) {
    console.error(`❌ [${sessionId}] Erreur sync messages:`, error);
    emitToSession(sessionId, 'sync_progress', {
      type: 'messages',
      status: 'error',
      message: 'Erreur synchronisation messages',
      error: String(error),
    });
  }

  // ============================================================================
  // SIGNAL FINAL
  // ============================================================================
  const duration = Math.round((Date.now() - startTime) / 1000);
  const totalSynced =
    syncStats.user.synced +
    syncStats.contacts.synced +
    syncStats.groups.synced +
    syncStats.conversations.synced +
    syncStats.messages.synced;

  console.log(`✅ [${sessionId}] Synchronisation terminée en ${duration}s`);
  console.log(`📊 [${sessionId}] Total synchronisé: ${totalSynced} éléments`);
  console.log(`   - Utilisateur: ${syncStats.user.synced}`);
  console.log(`   - Contacts: ${syncStats.contacts.synced}`);
  console.log(`   - Groupes: ${syncStats.groups.synced}`);
  console.log(`   - Conversations: ${syncStats.conversations.synced}`);
  console.log(`   - Messages: ${syncStats.messages.synced}`);

  emitToSession(sessionId, 'whatsapp_event', {
    type: 'sync_complete',
    data: {
      user: sock.user,
      message: 'Synchronisation terminée',
      duration,
      stats: syncStats,
      totalSynced,
    },
  });

  emitToSession(sessionId, 'whatsapp_event', {
    type: 'connected',
    data: {
      user: sock.user,
      message: 'WhatsApp connecté et données synchronisées',
    },
  });
}
