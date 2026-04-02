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

      // Chercher si le groupe existe déjà
      // Note: Ajoutez un champ whatsappId au modèle Group
      const existingGroup = await prisma.group.findFirst({
        where: {
          // whatsappId: groupWhatsappId,
          // OU chercher par nom si pas de whatsappId
          name: waGroup.subject,
        },
      });

      // Déterminer l'owner
      const ownerPhone = waGroup.owner?.split('@')[0].split(':')[0];
      let ownerId = userId; // Par défaut, l'utilisateur actuel

      if (ownerPhone) {
        const ownerContact = await prisma.contact.findFirst({
          where: {
            userId,
            phone: ownerPhone,
          },
          select: { contactUserId: true },
        });
        ownerId = ownerContact?.contactUserId || userId;
      }

      const groupData: any = {
        name: waGroup.subject,
        description: waGroup.desc || undefined,
        // whatsappId: groupWhatsappId, // Ajoutez ce champ
        ownerId,
        maxMembers: 256, // Limite par défaut WhatsApp
        isPublic: false,
        onlyAdminsCanPost: waGroup.announce || false,
        ephemeralEnabled: !!waGroup.ephemeralDuration,
        ephemeralDuration: waGroup.ephemeralDuration || undefined,
        totalMessages: 0,
        activeMembers: waGroup.participants?.length || 0,
        updatedAt: new Date(),
      };

      let groupId: string;

      if (existingGroup) {
        // Mettre à jour le groupe existant
        const updated = await prisma.group.update({
          where: { id: existingGroup.id },
          data: groupData,
        });
        groupId = updated.id;
        stats.updated++;
      } else {
        // Créer un nouveau groupe
        const created = await prisma.group.create({
          data: groupData,
        });
        groupId = created.id;
        stats.created++;
      }

      // Synchroniser les membres du groupe
      if (waGroup.participants) {
        await syncGroupMembers(groupId, waGroup.participants, userId);
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
async function syncGroupMembers(
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
      let role: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER' = 'MEMBER';
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
      // whatsappId: groupWhatsappId,
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
  role: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER' = 'MEMBER'
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
