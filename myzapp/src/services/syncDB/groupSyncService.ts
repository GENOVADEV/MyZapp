// src/services/syncDB/groupSyncService.ts
import { prisma } from '@/lib/prisma';
import type { GroupMetadata } from '@whiskeysockets/baileys';

interface SyncGroupsResult {
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
 * Synchronise les groupes WhatsApp avec la DB
 */
export async function syncGroups(
  whatsappGroups: GroupMetadata[],
  userId: string
): Promise<SyncGroupsResult> {
  const errors: string[] = [];
  const stats = {
    total: whatsappGroups.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  console.log(`👥 Début synchronisation de ${stats.total} groupes pour user ${userId}`);

  for (const waGroup of whatsappGroups) {
    try {
      const groupWhatsappId = waGroup.id;

      const existingGroup = await prisma.group.findFirst({
        where: {
          whatsappId: groupWhatsappId,
        },
      });

      // 🔹 Owner WhatsApp
      const ownerJid = waGroup.owner;
      const ownerPhoneNumber = ownerJid?.split('@')[0]?.split(':')[0];

      // 🔹 Conversion timestamps → Date
      const subjectTime = waGroup.subjectTime
        ? new Date(waGroup.subjectTime * 1000)
        : undefined;

      const descTime = waGroup.descTime
        ? new Date(waGroup.descTime * 1000)
        : undefined;

      const creation = waGroup.creation
        ? new Date(waGroup.creation * 1000)
        : new Date();

      // 🔹 Mapping complet
      const groupData: any = {
        // WhatsApp
        whatsappId: groupWhatsappId,
        addressingMode: waGroup.addressingMode,

        // Infos principales
        name: waGroup.subject,
        description: waGroup.desc || undefined,

        // Owner (IMPORTANT)
        ownerId: userId, // 👈 ton user DB
        ownerJid,
        ownerPhoneNumber,
        ownerCountryCode: waGroup.owner_country_code,

        // Subject
        subjectOwner: waGroup.subjectOwner,
        subjectOwnerPn: waGroup.subjectOwnerPn,
        subjectTime,

        // Description metadata
        descOwner: waGroup.descOwner,
        descOwnerPn: waGroup.descOwnerPn,
        descId: waGroup.descId,
        descTime,

        // Settings
        onlyAdminsCanEdit: waGroup.restrict ?? false,
        onlyAdminsCanPost: waGroup.announce ?? false,
        membersCanAddOthers: waGroup.memberAddMode ?? true,
        joinApprovalMode: waGroup.joinApprovalMode ?? false,

        // Community
        isCommunity: waGroup.isCommunity ?? false,
        isCommunityAnnounce: waGroup.isCommunityAnnounce ?? false,
        linkedParent: waGroup.linkedParent,

        // Participants
        size: waGroup.size || waGroup.participants?.length || 0,
        activeMembers: waGroup.participants?.length || 0,

        // Ephemeral
        ephemeralEnabled: !!waGroup.ephemeralDuration,
        ephemeralDuration: waGroup.ephemeralDuration || undefined,

        // Invite
        inviteCode: waGroup.inviteCode || undefined,

        // Meta
        updatedAt: new Date(),
        createdAt: creation,
      };

      let groupId: string;

      if (existingGroup) {
        const updated = await prisma.group.update({
          where: { id: existingGroup.id },
          data: groupData,
        });
        groupId = updated.id;
        stats.updated++;
      } else {
        const created = await prisma.group.create({
          data: groupData,
        });
        groupId = created.id;
        stats.created++;
      }

      // 🔥 Sync participants avec rôles
      if (waGroup.participants) {
        await syncGroupMembers(
          groupId,
          waGroup.participants.map((p) => ({
            ...p,
            isAdmin: p.admin === "admin" || p.admin === "superadmin",
            isSuperAdmin: p.admin === "superadmin",
          })),
          userId
        );
      }

    } catch (error) {
      console.error(`❌ Erreur sync groupe ${waGroup.id}:`, error);
      errors.push(`Groupe ${waGroup.id}: ${error}`);
      stats.failed++;
    }
  }

  const synced = stats.created + stats.updated;

  console.log(
    `✅ Synchronisation groupes terminée: ${synced}/${stats.total} (${stats.created} créés, ${stats.updated} mis à jour)`
  );

  return {
    success: true,
    synced,
    errors,
    stats,
  };
}

/**
 * Synchronise les membres d'un groupe
 */
export async function syncGroupMembers(
  groupId: string,
  participants: any[],
  userId: string
): Promise<void> {
  try {
    for (const participant of participants) {
      const phone = participant.id.split('@')[0].split(':')[0];

      // Chercher le contact correspondant
      const contact = await prisma.contact.findFirst({
        where: {
          userId,
          phone,
        },
        select: { contactUserId: true },
      });

      const memberId = contact?.contactUserId || userId;

      // Déterminer le rôle
      let role: 'OWNER' | 'ADMIN' | 'MEMBER' = 'MEMBER';
      if (participant.admin === 'admin') {
        role = 'ADMIN';
      } else if (participant.admin === 'superadmin') {
        role = 'OWNER';
      }

      // Vérifier si le membre existe déjà
      const existingMember = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: memberId,
          },
        },
      });

      if (existingMember) {
        // Mettre à jour le membre existant
        await prisma.groupMember.update({
          where: { id: existingMember.id },
          data: {
            role,
          },
        });
      } else {
        // Ajouter un nouveau membre
        await prisma.groupMember.create({
          data: {
            groupId,
            userId: memberId,
            role,
          },
        });
      }
    }
  } catch (error) {
    console.error('❌ Erreur sync membres groupe:', error);
  }
}

/**
 * Met à jour les métadonnées d'un groupe
 */
export async function updateGroupMetadata(
  groupWhatsappId: string,
  metadata: Partial<GroupMetadata>
): Promise<void> {
  const updateData: any = {};

  if (metadata.subject) updateData.name = metadata.subject;
  if (metadata.desc !== undefined) updateData.description = metadata.desc;
  if (metadata.announce !== undefined)
    updateData.onlyAdminsCanPost = metadata.announce;
  if (metadata.ephemeralDuration !== undefined) {
    updateData.ephemeralEnabled = !!metadata.ephemeralDuration;
    updateData.ephemeralDuration = metadata.ephemeralDuration;
  }

  updateData.updatedAt = new Date();

  await prisma.group.updateMany({
    where: {
       whatsappId: groupWhatsappId,
    },
    data: updateData,
  });
}

/**
 * Ajoute un membre à un groupe
 */
export async function addGroupMember(
  groupId: string,
  userId: string,
  role: 'OWNER' | 'ADMIN' |'MEMBER' = 'MEMBER'
): Promise<void> {
  await prisma.groupMember.upsert({
    where: {
      groupId_userId: {
        groupId,
        userId,
      },
    },
    create: {
      groupId,
      userId,
      role,
    },
    update: {
      role,
      leftAt: null, // Réactiver si déjà parti
    },
  });
}

/**
 * Retire un membre d'un groupe
 */
export async function removeGroupMember(
  groupId: string,
  userId: string
): Promise<void> {
  await prisma.groupMember.update({
    where: {
      groupId_userId: {
        groupId,
        userId,
      },
    },
    data: {
      leftAt: new Date(),
    },
  });
}
