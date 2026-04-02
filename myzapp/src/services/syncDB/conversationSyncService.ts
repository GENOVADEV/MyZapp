// src/services/syncDB/conversationSyncService.ts
import { prisma } from '@/lib/prisma';
import type { Chat } from '@whiskeysockets/baileys';

interface WhatsAppChat {
  id: string;
  conversationTimestamp?: number;
  unreadCount?: number;
  name?: string;
  notSpam?: boolean;
  archived?: boolean;
  pinned?: number;
  muteEndTime?: number;
  ephemeralExpiration?: number;
  ephemeralSettingTimestamp?: number;
}

interface SyncConversationsResult {
  success: boolean;
  synced: number;
  errors: string[];
  stats: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
}

/**
 * Synchronise les conversations WhatsApp avec la DB
 */
export async function syncConversations(
  whatsappChats: WhatsAppChat[],
  userId: string
): Promise<SyncConversationsResult> {
  const errors: string[] = [];
  const stats = {
    total: whatsappChats.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  console.log(`💬 Début synchronisation de ${stats.total} conversations pour user ${userId}`);

  for (const waChat of whatsappChats) {
    try {
      // Déterminer le type de conversation
      const isGroup = waChat.id.includes('@g.us');
      const isSelf = waChat.id === 'status@broadcast';

      if (isSelf) {
        stats.skipped++;
        continue;
      }

      const conversationType = isGroup ? 'GROUP' : 'DIRECT';

      // Extraire l'ID pour la recherche de contact/groupe
      const whatsappId = waChat.id;
      const phone = isGroup ? null : whatsappId.split('@')[0].split(':')[0];

      // Chercher le contact ou groupe correspondant
      let contactId: string | null = null;
      let groupId: string | null = null;

      if (isGroup) {
        // Chercher ou créer le groupe
        const groupResult = await syncGroupFromChat(waChat, userId);
        groupId = groupResult.groupId;
      } else if (phone) {
        // Chercher le contact
        const contact = await prisma.contact.findFirst({
          where: { userId, phone },
          select: { id: true, name: true },
        });
        contactId = contact?.id || null;
      }

      // Vérifier si la conversation existe déjà
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          userId,
          whatsappId,
        },
      });

      // Préparer les données de conversation
      const conversationData: any = {
        userId,
        type: conversationType,
        whatsappId,
        contactId,
        groupId,
        name: waChat.name || undefined,
        isPinned: waChat.pinned ? waChat.pinned > 0 : false,
        isMuted: waChat.muteEndTime ? waChat.muteEndTime > Date.now() : false,
        mutedUntil: waChat.muteEndTime
          ? new Date(waChat.muteEndTime)
          : undefined,
        isArchived: waChat.archived || false,
        unreadCount: waChat.unreadCount || 0,
        lastMessageAt: waChat.conversationTimestamp
          ? new Date(waChat.conversationTimestamp * 1000)
          : undefined,
        ephemeralEnabled: !!waChat.ephemeralExpiration,
        ephemeralDuration: waChat.ephemeralExpiration || undefined,
        updatedAt: new Date(),
      };

      if (existingConversation) {
        // Mettre à jour la conversation existante
        await prisma.conversation.update({
          where: { id: existingConversation.id },
          data: conversationData,
        });
        stats.updated++;
      } else {
        // Créer une nouvelle conversation
        await prisma.conversation.create({
          data: conversationData,
        });
        stats.created++;
      }
    } catch (error) {
      console.error(`❌ Erreur sync conversation ${waChat.id}:`, error);
      errors.push(`Conversation ${waChat.id}: ${error}`);
      stats.failed++;
    }
  }

  const synced = stats.created + stats.updated;

  console.log(
    `✅ Synchronisation conversations terminée: ${synced}/${stats.total} (${stats.created} créées, ${stats.updated} mises à jour)`
  );

  return {
    success: true,
    synced,
    errors,
    stats,
  };
}

/**
 * Synchronise un groupe depuis une conversation WhatsApp
 */
async function syncGroupFromChat(
  waChat: WhatsAppChat,
  userId: string
): Promise<{ groupId: string | null }> {
  try {
    const groupWhatsappId = waChat.id;

    // Chercher un groupe existant
    const existingGroup = await prisma.group.findFirst({
      where: {
        // Note: Vous devrez ajouter un champ whatsappId au modèle Group
        name: waChat.name || groupWhatsappId,
      },
    });

    if (existingGroup) {
      return { groupId: existingGroup.id };
    }

    // Créer un nouveau groupe
    const newGroup = await prisma.group.create({
      data: {
        name: waChat.name || 'Groupe WhatsApp',
        ownerId: userId, // Le premier utilisateur devient owner
        ephemeralEnabled: !!waChat.ephemeralExpiration,
        ephemeralDuration: waChat.ephemeralExpiration,
      },
    });

    // Ajouter l'utilisateur actuel comme membre
    await prisma.groupMember.create({
      data: {
        groupId: newGroup.id,
        userId,
        role: 'OWNER',
      },
    });

    return { groupId: newGroup.id };
  } catch (error) {
    console.error('❌ Erreur sync groupe:', error);
    return { groupId: null };
  }
}

/**
 * Synchronise une conversation individuelle
 */
export async function syncSingleConversation(
  waChat: WhatsAppChat,
  userId: string
): Promise<{ success: boolean; conversation?: any; error?: string }> {
  try {
    const isGroup = waChat.id.includes('@g.us');
    const conversationType = isGroup ? 'GROUP' : 'DIRECT';
    const whatsappId = waChat.id;
    const phone = isGroup ? null : whatsappId.split('@')[0].split(':')[0];

    let contactId: string | null = null;
    let groupId: string | null = null;

    if (isGroup) {
      const groupResult = await syncGroupFromChat(waChat, userId);
      groupId = groupResult.groupId;
    } else if (phone) {
      const contact = await prisma.contact.findFirst({
        where: { userId, phone },
        select: { id: true },
      });
      contactId = contact?.id || null;
    }

    const existingConversation = await prisma.conversation.findFirst({
      where: { userId, whatsappId },
    });

    const conversationData: any = {
      userId,
      type: conversationType,
      whatsappId,
      contactId,
      groupId,
      name: waChat.name || undefined,
      isPinned: waChat.pinned ? waChat.pinned > 0 : false,
      isMuted: waChat.muteEndTime ? waChat.muteEndTime > Date.now() : false,
      mutedUntil: waChat.muteEndTime ? new Date(waChat.muteEndTime) : undefined,
      isArchived: waChat.archived || false,
      unreadCount: waChat.unreadCount || 0,
      lastMessageAt: waChat.conversationTimestamp
        ? new Date(waChat.conversationTimestamp * 1000)
        : undefined,
      ephemeralEnabled: !!waChat.ephemeralExpiration,
      ephemeralDuration: waChat.ephemeralExpiration || undefined,
      updatedAt: new Date(),
    };

    if (existingConversation) {
      const updated = await prisma.conversation.update({
        where: { id: existingConversation.id },
        data: conversationData,
      });
      return { success: true, conversation: updated };
    } else {
      const created = await prisma.conversation.create({
        data: conversationData,
      });
      return { success: true, conversation: created };
    }
  } catch (error) {
    console.error('❌ Erreur sync conversation individuelle:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Met à jour le compteur de messages non lus
 */
export async function updateUnreadCount(
  whatsappId: string,
  userId: string,
  unreadCount: number
): Promise<void> {
  await prisma.conversation.updateMany({
    where: {
      userId,
      whatsappId,
    },
    data: {
      unreadCount,
      updatedAt: new Date(),
    },
  });
}

/**
 * Marque une conversation comme lue
 */
export async function markConversationAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  await prisma.conversation.update({
    where: {
      id: conversationId,
      userId,
    },
    data: {
      unreadCount: 0,
      lastReadAt: new Date(),
      updatedAt: new Date(),
    },
  });
}
