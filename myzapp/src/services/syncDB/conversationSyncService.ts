// src/services/syncDB/conversationSyncService.ts
import { prisma } from '@/lib/prisma';

// Types pour les conversations WhatsApp (basés sur Baileys)
interface WhatsAppChat {
  id: string; // Format: 1234567890@s.whatsapp.net ou 1234567890-123456@g.us
  name?: string;
  unreadCount?: number;
  lastMessageReceivedTime?: number;
  lastMessageSentTime?: number;
  isGroup?: boolean;
  isReadOnly?: boolean;
  isAnnounceGrp?: boolean;
  archive?: boolean;
  muteExpiration?: number;
  tcToken?: Buffer;
  tcTokenTimestamp?: number;
  pin?: number;
  labels?: string[];
  ephemeralExpiration?: number;
  ephemeralSettingTimestamp?: number;
  conversationTimestamp?: number;
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
    groups: number;
    individuals: number;
  };
}

/**
 * Synchronise les conversations WhatsApp avec la base de données
 */
export async function syncConversations(
  whatsappChats: WhatsAppChat[], 
  userId: string
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    errors: [],
    stats: { total: 0, new: 0, updated: 0, skipped: 0, groups: 0, individuals: 0 }
  };

  try {
    result.stats.total = whatsappChats.length;

    for (const whatsappChat of whatsappChats) {
      try {
        const syncResult = await syncSingleConversation(whatsappChat, userId);
        
        if (syncResult.status === 'created') result.stats.new++;
        if (syncResult.status === 'updated') result.stats.updated++;
        if (syncResult.status === 'skipped') result.stats.skipped++;
        
        if (syncResult.conversation?.type === 'GROUP') result.stats.groups++;
        if (syncResult.conversation?.type === 'DIRECT') result.stats.individuals++;
        
        result.synced++;
      } catch (error) {
        result.errors.push(`Conversation ${whatsappChat.id}: ${(error as Error).message}`);
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
 * Synchronise une seule conversation
 */
async function syncSingleConversation(whatsappChat: WhatsAppChat, userId: string) {
  // Valider l'ID de conversation
  if (!whatsappChat.id) {
    return { status: 'skipped' as const, reason: 'ID manquant' };
  }

  // Déterminer le type de conversation
  const isGroup = whatsappChat.id.endsWith('@g.us');
  const conversationType = isGroup ? 'GROUP' : 'DIRECT' as const;

  // Déterminer le nom de la conversation
  const conversationName = determineConversationName(whatsappChat, conversationType);

  // Préparer les données pour la création/mise à jour
  const conversationData = {
    whatsappId: whatsappChat.id,
    type: conversationType as any,
    name: conversationName,
    unreadCount: whatsappChat.unreadCount || 0,
    lastMessageAt: whatsappChat.lastMessageReceivedTime ? 
      new Date(whatsappChat.lastMessageReceivedTime) : null,
    isArchived: whatsappChat.archive || false,
    isMuted: whatsappChat.muteExpiration ? whatsappChat.muteExpiration > Date.now() : false,
    mutedUntil: whatsappChat.muteExpiration ? new Date(whatsappChat.muteExpiration) : null,
    isPinned: !!whatsappChat.pin,
    ephemeralEnabled: !!whatsappChat.ephemeralExpiration,
    ephemeralDuration: whatsappChat.ephemeralExpiration || null,
    updatedAt: new Date()
  };

  // Upsert de la conversation
  const conversation = await prisma.conversation.upsert({
    where: {
      userId_whatsappId: {
        userId,
        whatsappId: whatsappChat.id
      }
    },
    update: conversationData,
    create: {
      userId,
      ...conversationData,
      createdAt: new Date()
    },
    include: {
      contact: {
        include: {
          contactUser: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        }
      },
      group: {
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              image: true
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true
                }
              }
            }
          }
        }
      },
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          content: true,
          type: true,
          createdAt: true
        }
      }
    }
  });

  // Pour les conversations directes, associer le contact si possible
  if (conversationType === 'DIRECT') {
    await associateConversationWithContact(conversation, userId);
  }

  // Pour les groupes, créer/mettre à jour l'entrée Group
  if (conversationType === 'GROUP') {
    await syncGroupData(whatsappChat, conversation, userId);
  }

  return { 
    status: conversation.createdAt.getTime() === conversation.updatedAt.getTime() ? 'created' : 'updated',
    conversation 
  };
}

/**
 * Détermine le nom à utiliser pour la conversation
 */
function determineConversationName(chat: WhatsAppChat, type: 'GROUP' | 'DIRECT'): string {
  if (chat.name) return chat.name;
  
  if (type === 'DIRECT') {
    // Extraire le numéro de téléphone de l'ID
    const phoneMatch = chat.id.match(/^(\d+)@/);
    return phoneMatch ? `+${phoneMatch[1]}` : 'Contact sans nom';
  }
  
  return 'Groupe sans nom';
}

/**
 * Associe une conversation directe avec un contact existant
 */
async function associateConversationWithContact(conversation: any, userId: string) {
  try {
    // Extraire le numéro de téléphone de l'ID WhatsApp
    const phoneMatch = conversation.whatsappId.match(/^(\d+)@/);
    if (!phoneMatch) return;

    const phone = phoneMatch[1];
    
    // Chercher le contact correspondant
    const contact = await prisma.contact.findFirst({
      where: {
        userId,
        phone
      }
    });

    if (contact) {
      // Associer la conversation au contact
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { contactId: contact.id }
      });
    }
  } catch (error) {
    console.error('Erreur association conversation-contact:', error);
  }
}

/**
 * Synchronise les données de groupe
 */
async function syncGroupData(whatsappChat: WhatsAppChat, conversation: any, userId: string) {
  try {
    const group = await prisma.group.upsert({
      where: {
        id: conversation.groupId
     },
      update: {
        name: whatsappChat.name || 'Groupe sans nom',
        description: undefined, // WhatsApp ne fournit pas de description
        avatar: undefined, // À récupérer séparément si disponible
        isPublic: !whatsappChat.isReadOnly,
        maxMembers: 256, // Valeur par défaut
        updatedAt: new Date()
      },
      create: {
        name: whatsappChat.name || 'Groupe sans nom',
        ownerId: userId, // L'utilisateur actuel est considéré comme owner
        id: conversation.groupId,
        isPublic: !whatsappChat.isReadOnly,
        maxMembers: 256
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    });

    // Associer le groupe à la conversation
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { groupId: group.id }
    });

  } catch (error) {
    console.error('Erreur synchronisation groupe:', error);
  }
}

/**
 * Service pour la gestion avancée des conversations
 */
export class ConversationManager {
  /**
   * Récupère les conversations avec pagination et filtres
   */
  static async getConversations(
    userId: string, 
    filters?: { 
      type?: 'DIRECT' | 'GROUP';
      archived?: boolean;
      muted?: boolean;
      pinned?: boolean;
      search?: string;
    },
    page: number = 1, 
    limit: number = 50
  ) {
    const skip = (page - 1) * limit;
    
    const where: any = { userId };
    
    if (filters?.type) where.type = filters.type;
    if (filters?.archived !== undefined) where.isArchived = filters.archived;
    if (filters?.muted !== undefined) where.isMuted = filters.muted;
    if (filters?.pinned !== undefined) where.isPinned = filters.pinned;
    
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { contact: { name: { contains: filters.search, mode: 'insensitive' } } },
        { group: { name: { contains: filters.search, mode: 'insensitive' } } }
      ];
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          contact: {
            include: {
              contactUser: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  phone: true
                }
              }
            }
          },
          group: {
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                  image: true
                }
              },
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      image: true
                    }
                  }
                }
              }
            }
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              content: true,
              type: true,
              createdAt: true,
              sender: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          folder: {
            select: {
              id: true,
              name: true,
              color: true
            }
          }
        },
        orderBy: [
          { isPinned: 'desc' },
          { lastMessageAt: 'desc' },
          { updatedAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.conversation.count({ where })
    ]);

    return {
      conversations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Épingler/désépingler une conversation
   */
  static async togglePin(userId: string, conversationId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId }
    });

    if (!conversation) {
      throw new Error('Conversation non trouvée');
    }

    return await prisma.conversation.update({
      where: { id: conversationId },
      data: { isPinned: !conversation.isPinned },
      include: {
        contact: {
          include: {
            contactUser: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
        },
        group: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * Archiver/désarchiver une conversation
   */
  static async toggleArchive(userId: string, conversationId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId }
    });

    if (!conversation) {
      throw new Error('Conversation non trouvée');
    }

    return await prisma.conversation.update({
      where: { id: conversationId },
      data: { isArchived: !conversation.isArchived },
      include: {
        contact: {
          include: {
            contactUser: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * Marquer une conversation comme lue
   */
  static async markAsRead(userId: string, conversationId: string) {
    return await prisma.conversation.update({
      where: { id: conversationId, userId },
      data: { 
        unreadCount: 0,
        lastReadAt: new Date()
      }
    });
  }

  /**
   * Obtenir les statistiques des conversations
   */
  static async getStats(userId: string) {
    const stats = await prisma.conversation.aggregate({
      where: { userId },
      _count: {
        id: true,
        _all: true
      },
      _sum: {
        unreadCount: true
      }
    });

    const byType = await prisma.conversation.groupBy({
      by: ['type'],
      where: { userId },
      _count: { id: true }
    });

    const archived = await prisma.conversation.count({
      where: { userId, isArchived: true }
    });

    const pinned = await prisma.conversation.count({
      where: { userId, isPinned: true }
    });

    const muted = await prisma.conversation.count({
      where: { userId, isMuted: true }
    });

    return {
      total: stats._count.id,
      unreadTotal: stats._sum.unreadCount || 0,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      archived,
      pinned,
      muted,
      regular: stats._count.id - archived - pinned
    };
  }
}

/**
 * Fonction utilitaire pour nettoyer les anciennes conversations
 */
export async function cleanupOldConversations(userId: string, olderThanDays: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const result = await prisma.conversation.deleteMany({
    where: {
      userId,
      isArchived: true,
      lastMessageAt: { lt: cutoffDate },
      isPinned: false
    }
  });

  return {
    deleted: result.count,
    message: `${result.count} conversations archivées supprimées`
  };
}
