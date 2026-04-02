// src/services/syncDB/contactSyncService.ts
import { prisma } from '@/lib/prisma';

interface WhatsAppContact {
  id: string;
  name?: string;
  notify?: string;
  verifiedName?: string;
  imgUrl?: string;
  status?: string;
}

interface SyncContactsResult {
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
 * Synchronise les contacts WhatsApp avec la DB
 */
export async function syncContacts(
  whatsappContacts: WhatsAppContact[],
  userId: string
): Promise<SyncContactsResult> {
  const errors: string[] = [];
  const stats = {
    total: whatsappContacts.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  console.log(`📇 Début synchronisation de ${stats.total} contacts pour user ${userId}`);

  for (const waContact of whatsappContacts) {
    try {
      // Extraire le numéro de téléphone
      const phone = waContact.id.split('@')[0].split(':')[0];

      // Ignorer les numéros invalides ou les groupes
      if (!phone || phone.includes('-') || waContact.id.includes('@g.us')) {
        stats.skipped++;
        continue;
      }

      // Priorité pour le nom: verifiedName > notify > name
      const contactName =
        waContact.verifiedName || waContact.notify || waContact.name || phone;

      // Vérifier si le contact existe déjà
      const existingContact = await prisma.contact.findFirst({
        where: {
          userId,
          phone,
        },
      });

      if (existingContact) {
        // Mettre à jour le contact existant
        await prisma.contact.update({
          where: { id: existingContact.id },
          data: {
            name: contactName,
            avatar: waContact.imgUrl || existingContact.avatar,
            bio: waContact.status || existingContact.bio,
            updatedAt: new Date(),
          },
        });
        stats.updated++;
      } else {
        // Vérifier si c'est un utilisateur de l'app
        const contactUser = await prisma.user.findUnique({
          where: { phone },
          select: { id: true },
        });

        // Créer un nouveau contact
        await prisma.contact.create({
          data: {
            userId,
            contactUserId: contactUser?.id,
            name: contactName,
            phone,
            avatar: waContact.imgUrl,
            bio: waContact.status,
          },
        });
        stats.created++;
      }
    } catch (error) {
      console.error(`❌ Erreur sync contact ${waContact.id}:`, error);
      errors.push(`Contact ${waContact.id}: ${error}`);
      stats.failed++;
    }
  }

  const synced = stats.created + stats.updated;

  console.log(
    `✅ Synchronisation contacts terminée: ${synced}/${stats.total} (${stats.created} créés, ${stats.updated} mis à jour)`
  );

  return {
    success: true,
    synced,
    errors,
    stats,
  };
}

/**
 * Synchronise un contact individuel
 */
export async function syncSingleContact(
  whatsappContact: WhatsAppContact,
  userId: string
): Promise<{ success: boolean; contact?: any; error?: string }> {
  try {
    const phone = whatsappContact.id.split('@')[0].split(':')[0];

    if (!phone || phone.includes('-') || whatsappContact.id.includes('@g.us')) {
      return { success: false, error: 'Numéro invalide ou groupe' };
    }

    const contactName =
      whatsappContact.verifiedName ||
      whatsappContact.notify ||
      whatsappContact.name ||
      phone;

    const existingContact = await prisma.contact.findFirst({
      where: { userId, phone },
    });

    if (existingContact) {
      const updated = await prisma.contact.update({
        where: { id: existingContact.id },
        data: {
          name: contactName,
          avatar: whatsappContact.imgUrl || existingContact.avatar,
          bio: whatsappContact.status || existingContact.bio,
          updatedAt: new Date(),
        },
      });
      return { success: true, contact: updated };
    } else {
      const contactUser = await prisma.user.findUnique({
        where: { phone },
        select: { id: true },
      });

      const created = await prisma.contact.create({
        data: {
          userId,
          contactUserId: contactUser?.id,
          name: contactName,
          phone,
          avatar: whatsappContact.imgUrl,
          bio: whatsappContact.status,
        },
      });
      return { success: true, contact: created };
    }
  } catch (error) {
    console.error('❌ Erreur sync contact individuel:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Supprime les contacts qui ne sont plus dans WhatsApp
 */
export async function cleanupOrphanedContacts(
  currentWhatsAppIds: string[],
  userId: string
): Promise<{ deleted: number }> {
  // Extraire les numéros de téléphone
  const phones = currentWhatsAppIds
    .map((id) => id.split('@')[0].split(':')[0])
    .filter((phone) => !phone.includes('-'));

  const result = await prisma.contact.deleteMany({
    where: {
      userId,
      phone: {
        notIn: phones,
      },
    },
  });

  console.log(`🧹 ${result.count} contacts orphelins supprimés`);
  return { deleted: result.count };
}
