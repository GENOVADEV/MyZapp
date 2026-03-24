// src/services/sync/contactSyncService.ts
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Types pour les contacts WhatsApp (basés sur Baileys)
interface WhatsAppContact {
  id: string; // Format: 1234567890@s.whatsapp.net
  name?: string;
  notify?: string;
  shortName?: string;
  imgUrl?: string;
  status?: string;
  verifiedName?: string;
}

interface SyncResult {
  success: boolean;
  synced: number;
  errors: string[];
  stats: {
    total: number;
    new: number;
    updated: number;
    skipped: number;
  };
}

/**
 * Synchronise les contacts WhatsApp avec la base de données
 */
export async function syncContacts(
  whatsappContacts: WhatsAppContact[], 
  userId: string
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    errors: [],
    stats: { total: 0, new: 0, updated: 0, skipped: 0 }
  };

  try {
    result.stats.total = whatsappContacts.length;

    for (const whatsappContact of whatsappContacts) {
      try {
        const syncResult = await syncSingleContact(whatsappContact, userId);
        
        if (syncResult.status === 'created') result.stats.new++;
        if (syncResult.status === 'updated') result.stats.updated++;
        if (syncResult.status === 'skipped') result.stats.skipped++;
        
        result.synced++;
      } catch (error) {
        result.errors.push(`Contact ${whatsappContact.id}: ${(error as Error).message}`);
      }
    }

    // Mettre à jour le timestamp de dernière synchronisation
    await prisma.user.update({
      where: { id: userId },
      data: { lastSyncAt: new Date() }
    });

  } catch (error) {
    result.success = false;
    result.errors.push(`Erreur générale: ${(error as Error).message}`);
  }

  return result;
}

/**
 * Synchronise un seul contact
 */
async function syncSingleContact(whatsappContact: WhatsAppContact, userId: string) {
  // Nettoyer et valider le numéro de téléphone
  const phone = extractPhoneNumber(whatsappContact.id);
  if (!phone) {
    return { status: 'skipped' as const, reason: 'Numéro invalide' };
  }

  // Déterminer le nom à utiliser
  const contactName = determineContactName(whatsappContact);
  
  // Vérifier si c'est un utilisateur de l'application
  const existingAppUser = await findAppUserByPhone(phone);

  // Préparer les données pour la création/mise à jour
  const contactData = {
    name: contactName,
    phone: phone,
    email: undefined, // WhatsApp ne fournit pas d'email
    avatar: whatsappContact.imgUrl || undefined,
    bio: whatsappContact.status || undefined,
    contactUserId: existingAppUser?.id || null,
    updatedAt: new Date()
  };

  // Upsert du contact
  const contact = await prisma.contact.upsert({
    where: {
      userId_phone: {
        userId,
        phone
      }
    },
    update: contactData,
    create: {
      userId,
      ...contactData,
      createdAt: new Date()
    },
    include: {
      contactUser: {
        select: {
          id: true,
          name: true,
          image: true
        }
      }
    }
  });

  return { 
    status: contact.createdAt.getTime() === contact.updatedAt.getTime() ? 'created' : 'updated',
    contact 
  };
}

/**
 * Extrait le numéro de téléphone de l'ID WhatsApp
 */
function extractPhoneNumber(whatsappId: string): string | null {
  try {
    // Format: 1234567890@s.whatsapp.net
    const phoneMatch = whatsappId.match(/^(\d+)@/);
    if (!phoneMatch) return null;
    
    const phone = phoneMatch[1];
    
    // Validation basique du numéro
    if (phone.length < 8 || phone.length > 15) return null;
    
    return phone;
  } catch {
    return null;
  }
}

/**
 * Détermine le meilleur nom à utiliser pour le contact
 */
function determineContactName(contact: WhatsAppContact): string {
  return (
    contact.verifiedName || 
    contact.name || 
    contact.notify || 
    contact.shortName || 
    extractPhoneNumber(contact.id) || 
    'Contact sans nom'
  );
}

/**
 * Recherche un utilisateur de l'application par numéro de téléphone
 */
async function findAppUserByPhone(phone: string) {
  return await prisma.user.findFirst({
    where: { 
      phone: phone,
      status: 'ACTIVE'
    },
    select: {
      id: true,
      name: true,
      image: true,
      phone: true
    }
  });
}

/**
 * Service pour la recherche et la gestion avancée des contacts
 */
export class ContactManager {
  /**
   * Recherche des contacts avec pagination et filtres
   */
  static async searchContacts(userId: string, query: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    
    const where: Prisma.ContactWhereInput = {
      userId,
      OR: [
        { name: { contains: query, mode: Prisma.QueryMode.insensitive } },
        { phone: { contains: query } },
        { email: { contains: query, mode: Prisma.QueryMode.insensitive } }
      ]
    };

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          contactUser: {
            select: {
              id: true,
              name: true,
              image: true,
              phone: true
            }
          },
          conversations: {
            take: 1,
            orderBy: { lastMessageAt: 'desc' },
            select: {
              id: true,
              lastMessageAt: true,
              unreadCount: true
            }
          }
        },
        orderBy: [
          { isFavorite: 'desc' },
          { name: 'asc' }
        ],
        skip,
        take: limit
      }),
      prisma.contact.count({ where })
    ]);

    return {
      contacts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Marquer un contact comme favori
   */
  static async toggleFavorite(userId: string, contactId: string) {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, userId }
    });

    if (!contact) {
      throw new Error('Contact non trouvé');
    }

    return await prisma.contact.update({
      where: { id: contactId },
      data: { isFavorite: !contact.isFavorite },
      include: {
        contactUser: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    });
  }

  /**
   * Bloquer/débloquer un contact
   */
  static async toggleBlock(userId: string, contactId: string) {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, userId }
    });

    if (!contact) {
      throw new Error('Contact non trouvé');
    }

    return await prisma.contact.update({
      where: { id: contactId },
      data: { isBlocked: !contact.isBlocked },
      include: {
        contactUser: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    });
  }

  /**
   * Obtenir les statistiques des contacts
   */
  static async getStats(userId: string) {
    const stats = await prisma.contact.aggregate({
      where: { userId },
      _count: {
        id: true
      }
    });

    const favorites = await prisma.contact.count({
      where: { userId, isFavorite: true }
    });

    const blocked = await prisma.contact.count({
      where: { userId, isBlocked: true }
    });

    const recentlyAdded = await prisma.contact.count({
      where: { 
        userId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 derniers jours
      }
    });

    return {
      total: stats._count.id,
      favorites,
      blocked,
      recentlyAdded,
      regular: stats._count.id - favorites - blocked
    };
  }
}