// src/services/syncDB/conversationSyncService.ts
import { prisma } from '@/lib/prisma';
import type { Chat } from '@whiskeysockets/baileys';
import { syncGroupMembers } from './groupSyncService';

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
  whatsappChats : Chat[],
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
  if(!whatsappChats){
    console.log(`⚠️ Aucun chat WhatsApp trouvé pour user ${userId}`);
    return {
      success: false,
      synced: 0,
      errors,
      stats
    };
  }
  for (const waChat of whatsappChats) {
  const whatsappId = waChat.id;
  let conversationData: any;

  try {
    const isGroup = whatsappId?.includes('@g.us');
    const isSelf = whatsappId === 'status@broadcast';

    if (isSelf) {
      stats.skipped++;
      continue;
    }

    const conversationType = isGroup ? 'GROUP' : 'DIRECT';

    const phone = isGroup
      ? null
      : whatsappId?.split('@')[0].split(':')[0];

    let contactId: string | null = null;
    let groupId: string | null = null;

    // ===== CONTACT / GROUP =====
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

    // ===== EXISTING =====
    const existingConversation = await prisma.conversation.findFirst({
      where: { userId, whatsappId: whatsappId || '' },
    });

    // ===== HELPERS =====
    const toDate = (val?: number | Long | null) =>
      val ? new Date(Number(val)) : undefined;

    const toBigInt = (val?: number | Long | null) =>
      val ? BigInt(val.toString()) : undefined;

    // ===== DATA =====
    conversationData = {
      userId,
      type: conversationType,
      whatsappId,
      contactId,
      groupId,

      // ===== BASIQUE =====
      name: waChat.name || waChat.displayName || undefined,
      description: waChat.description || undefined,

      // ===== FLAGS =====
      isPinned: waChat.pinned ? waChat.pinned > 0 : false,
      isMuted: waChat.muteEndTime
        ? Number(waChat.muteEndTime) > Date.now()
        : false,
      isArchived: waChat.archived || false,
      isLocked: waChat.locked || false,

      // ===== MUTED =====
      mutedUntil: waChat.muteEndTime
        ? new Date(Number(waChat.muteEndTime))
        : undefined,

      // ===== COUNTS =====
      unreadCount: waChat.unreadCount || 0,
      unreadMentionCount: waChat.unreadMentionCount || 0,

      // ===== TIMESTAMPS =====
      lastMessageAt: waChat.conversationTimestamp
        ? new Date(Number(waChat.conversationTimestamp) * 1000)
        : undefined,

      lastMsgTimestamp: toBigInt(waChat.lastMsgTimestamp),
      conversationTimestamp: toBigInt(waChat.conversationTimestamp),
      ephemeralSettingTimestamp: toBigInt(
        waChat.ephemeralSettingTimestamp
      ),
      tcTokenTimestamp: toBigInt(waChat.tcTokenTimestamp),
      tcTokenSenderTimestamp: toBigInt(
        waChat.tcTokenSenderTimestamp
      ),
      limitSharingSettingTimestamp: toBigInt(
        waChat.limitSharingSettingTimestamp
      ),

      // ===== EPHEMERAL =====
      ephemeralEnabled: !!waChat.ephemeralExpiration,
      ephemeralDuration: waChat.ephemeralExpiration || undefined,
      ephemeralExpiration: waChat.ephemeralExpiration || undefined,
      disappearingMode: waChat.disappearingMode || undefined,

      // ===== IDS =====
      newJid: waChat.newJid || undefined,
      oldJid: waChat.oldJid || undefined,
      pnJid: waChat.pnJid || undefined,
      lidJid: waChat.lidJid || undefined,

      // ===== SECURITY =====
      pHash: waChat.pHash || undefined,
      contactPrimaryIdentityKey:
        waChat.contactPrimaryIdentityKey || undefined,
      tcToken: waChat.tcToken || undefined,

      // ===== STATES =====
      readOnly: waChat.readOnly || false,
      notSpam: waChat.notSpam || false,
      markedAsUnread: waChat.markedAsUnread || false,
      suspended: waChat.suspended || false,
      terminated: waChat.terminated || false,
      support: waChat.support || false,

      // ===== GROUP =====
      isParentGroup: waChat.isParentGroup || false,
      parentGroupId: waChat.parentGroupId || undefined,
      isDefaultSubgroup: waChat.isDefaultSubgroup || false,

      // ===== SHARING =====
      shareOwnPn: waChat.shareOwnPn || false,
      limitSharing: waChat.limitSharing || false,
      limitSharingInitiatedByMe:
        waChat.limitSharingInitiatedByMe || false,
      limitSharingTrigger: waChat.limitSharingTrigger || undefined,

      // ===== META =====
      username: waChat.username || undefined,
      lidOriginType: waChat.lidOriginType || undefined,
      commentsCount: waChat.commentsCount || 0,

      // ===== MEDIA/UI =====
      wallpaper: waChat.wallpaper || undefined,
      mediaVisibility: waChat.mediaVisibility || undefined,

      // ===== SYSTEM =====
      systemMessageToInsert:
        waChat.systemMessageToInsert || undefined,
      endOfHistoryTransfer: waChat.endOfHistoryTransfer || false,
      endOfHistoryTransferType:
        waChat.endOfHistoryTransferType || undefined,

      // ===== CREATION =====
      createdBy: waChat.createdBy || undefined,
      createdAtTimestamp: toBigInt(waChat.createdAt),

      updatedAt: new Date(),
    };

    // ===== UPSERT =====
    if (existingConversation) {
      await prisma.conversation.update({
        where: { id: existingConversation.id },
        data: conversationData,
      });
      stats.updated++;
    } else {
      await prisma.conversation.create({
        data: conversationData,
      });
      stats.created++;
    }
  } catch (error: any) {
    if (error.code === 'P2002') {
      await prisma.conversation.updateMany({
        where: { userId, whatsappId: whatsappId || '' },
        data: conversationData,
      });
      stats.updated++;
    } else {
      throw error;
    }
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
  waChat: any,
  userId: string
): Promise<{ groupId: string | null }> {
  try {
    const groupWhatsappId = waChat?.id;

    if (!groupWhatsappId) {
      return { groupId: null };
    }

    // ===== HELPERS =====
    const toDate = (val?: number | Long | null) =>
      val ? new Date(Number(val) * 1000) : undefined;

    const toPhone = (jid?: string | null) =>
      jid ? jid.split('@')[0]?.split(':')[0] : undefined;

    // ===== OWNER =====
    const ownerJid = waChat.owner || waChat.subjectOwner;
    const ownerPhoneNumber = toPhone(ownerJid);

    // ===== TIMESTAMPS =====
    const subjectTime = toDate(waChat.subjectTime);
    const descTime = toDate(waChat.descTime);
    const creation = toDate(waChat.creation) || new Date();

    // ===== DATA =====
    const groupData: any = {
      // 🔹 IDENTITÉ
      whatsappId: groupWhatsappId,
      addressingMode: waChat.addressingMode,

      // 🔹 INFOS
      name: waChat.subject || waChat.name || 'Groupe WhatsApp',
      description: waChat.desc || waChat.description || undefined,

      // 🔹 OWNER
      ownerId: userId,
      ownerJid,
      ownerPhoneNumber,
      ownerCountryCode: waChat.owner_country_code,

      // 🔹 SUBJECT META
      subjectOwner: waChat.subjectOwner,
      subjectOwnerPn: waChat.subjectOwnerPn,
      subjectTime,

      // 🔹 DESCRIPTION META
      descOwner: waChat.descOwner,
      descOwnerPn: waChat.descOwnerPn,
      descId: waChat.descId,
      descTime,

      // 🔹 SETTINGS
      onlyAdminsCanEdit: waChat.restrict ?? false,
      onlyAdminsCanPost: waChat.announce ?? false,
      membersCanAddOthers: waChat.memberAddMode ?? true,
      joinApprovalMode: waChat.joinApprovalMode ?? false,

      // 🔹 COMMUNITY
      isCommunity: waChat.isCommunity ?? false,
      isCommunityAnnounce: waChat.isCommunityAnnounce ?? false,
      linkedParent: waChat.linkedParent,

      // 🔹 PARTICIPANTS
      size:
        waChat.size ||
        waChat.participants?.length ||
        0,
      activeMembers:
        waChat.participants?.length || 0,

      // 🔹 EPHEMERAL
      ephemeralEnabled: !!waChat.ephemeralDuration,
      ephemeralDuration: waChat.ephemeralDuration || undefined,

      // 🔹 INVITE
      inviteCode: waChat.inviteCode || undefined,

      // 🔹 FLAGS ADDITIONNELS (depuis Chat)
      isParentGroup: waChat.isParentGroup || false,
      isDefaultSubgroup: waChat.isDefaultSubgroup || false,
      parentGroupId: waChat.parentGroupId || undefined,

      // 🔹 META
      createdAt: creation,
      updatedAt: new Date(),
    };

    // ===== UPSERT =====
    const group = await prisma.group.upsert({
      where: {
        whatsappId: groupWhatsappId,
      },
      update: groupData,
      create: groupData,
    });

    // ===== SYNC PARTICIPANTS =====
    if (waChat.participants && Array.isArray(waChat.participants)) {
      await syncGroupMembers(
        group.id,
        waChat.participants.map((p: any) => ({
          ...p,
          isAdmin: p.admin === "admin" || p.admin === "superadmin",
          isSuperAdmin: p.admin === "superadmin",
        })),
        userId
      );
    } else {
      // fallback: ajouter au moins l'utilisateur courant
      await prisma.groupMember.upsert({
        where: {
          groupId_userId: {
            groupId: group.id,
            userId,
          },
        },
        update: {},
        create: {
          groupId: group.id,
          userId,
          role: 'MEMBER',
        },
      });
    }

    return { groupId: group.id };
  } catch (error) {
    console.error('❌ Erreur sync groupe:', error);
    return { groupId: null };
  }
}

// /**
//  * Synchronise une conversation individuelle
//  */
// export async function syncSingleConversation(
//   waChat: Chat,
//   userId: string
// ): Promise<{ success: boolean; conversation?: any; error?: string }> {
//   try {
//     const isGroup = waChat.id?.includes('@g.us');
//     const conversationType = isGroup ? 'GROUP' : 'DIRECT';
//     const whatsappId = waChat.id;
//     const phone = isGroup ? null : whatsappId?.split('@')[0].split(':')[0];

//     let contactId: string | null = null;
//     let groupId: string | null = null;

//     if (isGroup) {
//       const groupResult = await syncGroupFromChat(waChat, userId);
//       groupId = groupResult.groupId;
//     } else if (phone) {
//       const contact = await prisma.contact.findFirst({
//         where: { userId, phone },
//         select: { id: true },
//       });
//       contactId = contact?.id || null;
//     }

//     const existingConversation = await prisma.conversation.findFirst({
//       where: { userId, whatsappId: whatsappId || '' },
//     });

//     const conversationData: any = {
//       userId,
//       type: conversationType,
//       whatsappId,
//       contactId,
//       groupId,
//       name: waChat.name || undefined,
//       isPinned: waChat.pinned ? waChat.pinned > 0 : false,
//       isMuted: waChat.muteEndTime ? waChat.muteEndTime > Date.now() : false,
//       mutedUntil: waChat.muteEndTime ? new Date(waChat.muteEndTime) : undefined,
//       isArchived: waChat.archived || false,
//       unreadCount: waChat.unreadCount || 0,
//       lastMessageAt: waChat.conversationTimestamp
//         ? new Date(waChat.conversationTimestamp * 1000)
//         : undefined,
//       ephemeralEnabled: !!waChat.ephemeralExpiration,
//       ephemeralDuration: waChat.ephemeralExpiration || undefined,
//       updatedAt: new Date(),
//     };

//     if (existingConversation) {
//       const updated = await prisma.conversation.update({
//         where: { id: existingConversation.id },
//         data: conversationData,
//       });
//       return { success: true, conversation: updated };
//     } else {
//       const created = await prisma.conversation.create({
//         data: conversationData,
//       });
//       return { success: true, conversation: created };
//     }
//   } catch (error) {
//     console.error('❌ Erreur sync conversation individuelle:', error);
//     return { success: false, error: String(error) };
//   }
// }

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
