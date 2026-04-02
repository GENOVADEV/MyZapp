// src/services/syncDB/messageSyncService.ts
import { prisma } from '@/lib/prisma';
import type { proto } from '@whiskeysockets/baileys';

type WAMessage = proto.IWebMessageInfo;

interface SyncMessagesResult {
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
 * Synchronise les messages WhatsApp avec la DB
 */
export async function syncMessages(
  whatsappMessages: WAMessage[],
  userId: string
): Promise<SyncMessagesResult> {
  const errors: string[] = [];
  const stats = {
    total: whatsappMessages.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  console.log(`📨 Début synchronisation de ${stats.total} messages pour user ${userId}`);

  for (const waMsg of whatsappMessages) {
    try {
      // Ignorer les messages systèmes ou invalides
      if (!waMsg.message || !waMsg.key?.remoteJid) {
        stats.skipped++;
        continue;
      }

      const whatsappId = waMsg.key.remoteJid;
      const messageId = waMsg.key.id;
      if (!messageId) {
        stats.skipped++;
        continue;
      }
      const fromMe = waMsg.key.fromMe || false;

      // Trouver la conversation
      let conversation = await prisma.conversation.findFirst({
        where: { userId, whatsappId },
        select: { id: true },
      });

      if (!conversation) {
        // Au lieu de skip, on crée la conversation à la volée !
        const isGroup = whatsappId.includes('@g.us');
        
        try {
            conversation = await prisma.conversation.create({
                data: {
                    userId,
                    whatsappId,
                    type: isGroup ? 'GROUP' : 'DIRECT',
                    unreadCount: fromMe ? 0 : 1,  
                    lastMessageAt: new Date(),
                    updatedAt: new Date(),
                },
                select: { id: true }
            });
            console.log(`🆕 Conversation créée à la volée pour ${whatsappId}`);
        } catch (error) {
            console.error(`Impossible de créer la conversation pour ${whatsappId}`, error);
            stats.skipped++;
            continue; // Si ça plante vraiment, là on passe au suivant
        }
      }

      // Extraire le contenu du message
      const { content, type, mediaInfo } = extractMessageContent(waMsg);

      // Déterminer l'expéditeur
      const senderId = fromMe ? userId : await getSenderIdFromMessage(waMsg, userId);

      // Vérifier si le message existe déjà
      const existingMessage = await prisma.message.findFirst({
        where: {
          conversationId: conversation.id,
          whatsappMessageId: messageId,
        },
      });

      const messageData: any = {
        whatsappMessageId: messageId,
        conversationId: conversation.id,
        senderId,
        type,
        content,
        status: fromMe ? getMessageStatus(waMsg) : 'DELIVERED',
        createdAt: waMsg.messageTimestamp
          ? new Date(Number(waMsg.messageTimestamp) * 1000)
          : new Date(),
        isEdited: false,
        isDeleted: false,
        isPinned: waMsg.starred || false,
        isEphemeral: !!waMsg.message?.ephemeralMessage,
      };

      // Gérer les médias
      if (mediaInfo && mediaInfo.hasMedia) {
        const mediaFile = await createMediaFileFromMessage(waMsg, userId, mediaInfo);
        if (mediaFile) {
          messageData.mediaFileId = mediaFile.id;
        }
      }

      // Gérer les réponses
      if (waMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quotedMessageId = waMsg.message.extendedTextMessage.contextInfo.stanzaId;
        if (quotedMessageId) {
          const replyTo = await prisma.message.findFirst({
            where: {
              conversationId: conversation.id,
              // whatsappMessageId: quotedMessageId,
            },
            select: { id: true },
          });
          messageData.replyToId = replyTo?.id;
        }
      }

      if (existingMessage) {
        await prisma.message.update({
          where: { id: existingMessage.id },
          data: messageData,
        });
        stats.updated++;
      } else {
        await prisma.message.create({
          data: messageData,
        });
        stats.created++;

        // Mettre à jour la conversation
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: messageData.createdAt,
            updatedAt: new Date(),
          },
        });
      }
    } catch (error) {
      console.error(`❌ Erreur sync message:`, error);
      errors.push(`Message: ${error}`);
      stats.failed++;
    }
  }

  const synced = stats.created + stats.updated;

  console.log(
    `✅ Synchronisation messages terminée: ${synced}/${stats.total} (${stats.created} créés, ${stats.updated} mis à jour)`
  );

  return {
    success: true,
    synced,
    errors,
    stats,
  };
}

/**
 * Extrait le contenu et le type d'un message WhatsApp
 */
function extractMessageContent(waMsg: WAMessage): {
  content: string | null;
  type: string;
  mediaInfo: { hasMedia: boolean; mediaType?: string } | null;
} {
  const msg = waMsg.message;

  if (!msg) {
    return { content: null, type: 'SYSTEM', mediaInfo: null };
  }

  // Message texte
  if (msg.conversation) {
    return { content: msg.conversation, type: 'TEXT', mediaInfo: null };
  }

  // Message texte étendu
  if (msg.extendedTextMessage) {
    return {
      content: msg.extendedTextMessage.text || null,
      type: 'TEXT',
      mediaInfo: null,
    };
  }

  // Image
  if (msg.imageMessage) {
    return {
      content: msg.imageMessage.caption || null,
      type: 'IMAGE',
      mediaInfo: { hasMedia: true, mediaType: 'IMAGE' },
    };
  }

  // Vidéo
  if (msg.videoMessage) {
    return {
      content: msg.videoMessage.caption || null,
      type: 'VIDEO',
      mediaInfo: { hasMedia: true, mediaType: 'VIDEO' },
    };
  }

  // Audio
  if (msg.audioMessage) {
    return {
      content: null,
      type: msg.audioMessage.ptt ? 'VOICE_NOTE' : 'AUDIO',
      mediaInfo: { hasMedia: true, mediaType: 'AUDIO' },
    };
  }

  // Document
  if (msg.documentMessage) {
    return {
      content: msg.documentMessage.fileName || null,
      type: 'DOCUMENT',
      mediaInfo: { hasMedia: true, mediaType: 'DOCUMENT' },
    };
  }

  // Sticker
  if (msg.stickerMessage) {
    return {
      content: null,
      type: 'STICKER',
      mediaInfo: { hasMedia: true, mediaType: 'IMAGE' },
    };
  }

  // Localisation
  if (msg.locationMessage) {
    const location = {
      latitude: msg.locationMessage.degreesLatitude,
      longitude: msg.locationMessage.degreesLongitude,
      name: msg.locationMessage.name,
    };
    return {
      content: JSON.stringify(location),
      type: 'LOCATION',
      mediaInfo: null,
    };
  }

  // Contact
  if (msg.contactMessage) {
    return {
      content: JSON.stringify({
        displayName: msg.contactMessage.displayName,
        vcard: msg.contactMessage.vcard,
      }),
      type: 'CONTACT',
      mediaInfo: null,
    };
  }

  // Poll
  if (msg.pollCreationMessage) {
    return {
      content: JSON.stringify({
        name: msg.pollCreationMessage.name,
        options: msg.pollCreationMessage.options,
      }),
      type: 'POLL',
      mediaInfo: null,
    };
  }

  return { content: null, type: 'TEXT', mediaInfo: null };
}

/**
 * Détermine le statut d'un message
 */
function getMessageStatus(waMsg: WAMessage): string {
  const status = waMsg.status;

  switch (status) {
    case 0:
      return 'SENDING';
    case 1:
      return 'SENT';
    case 2:
      return 'DELIVERED';
    case 3:
      return 'READ';
    default:
      return 'SENT';
  }
}

/**
 * Récupère l'ID de l'expéditeur depuis un message
 */
async function getSenderIdFromMessage(
  waMsg: WAMessage,
  userId: string
): Promise<string> {
  const participant = waMsg.participant || waMsg.key?.participant;
  const remoteJid = waMsg.key?.remoteJid;

  if (!participant && !remoteJid) {
    return userId;
  }

  const senderPhone = (participant || remoteJid)!.split('@')[0].split(':')[0];

  // Chercher le contact
  const contact = await prisma.contact.findFirst({
    where: {
      userId,
      phone: senderPhone,
    },
    select: { contactUserId: true },
  });

  return contact?.contactUserId || userId;
}

/**
 * Crée un fichier média depuis un message
 */
async function createMediaFileFromMessage(
  waMsg: WAMessage,
  userId: string,
  mediaInfo: { mediaType?: string }
): Promise<any | null> {
  try {
    const msg = waMsg.message;
    let mediaMessage: any;
    let fileName: string;
    let mimeType: string;
    let fileSize: number = 0;

    if (msg?.imageMessage) {
      mediaMessage = msg.imageMessage;
      fileName = `image_${Date.now()}.jpg`;
      mimeType = mediaMessage.mimetype || 'image/jpeg';
      fileSize = Number(mediaMessage.fileLength) || 0;
    } else if (msg?.videoMessage) {
      mediaMessage = msg.videoMessage;
      fileName = `video_${Date.now()}.mp4`;
      mimeType = mediaMessage.mimetype || 'video/mp4';
      fileSize = Number(mediaMessage.fileLength) || 0;
    } else if (msg?.audioMessage) {
      mediaMessage = msg.audioMessage;
      fileName = `audio_${Date.now()}.ogg`;
      mimeType = mediaMessage.mimetype || 'audio/ogg';
      fileSize = Number(mediaMessage.fileLength) || 0;
    } else if (msg?.documentMessage) {
      mediaMessage = msg.documentMessage;
      fileName = mediaMessage.fileName || `document_${Date.now()}`;
      mimeType = mediaMessage.mimetype || 'application/octet-stream';
      fileSize = Number(mediaMessage.fileLength) || 0;
    } else {
      return null;
    }

    // Note: L'URL sera générée lors du téléchargement réel du média
    const mediaFile = await prisma.mediaFile.create({
      data: {
        userId,
        fileName,
        fileSize,
        mimeType,
        url: '', // À remplir après téléchargement
        type: (mediaInfo.mediaType as any) || 'DOCUMENT',
        storagePath: `whatsapp_media/${userId}/${fileName}`,
      },
    });

    return mediaFile;
  } catch (error) {
    console.error('❌ Erreur création média:', error);
    return null;
  }
}

/**
 * Met à jour le statut d'un message
 */
export async function updateMessageStatus(
  messageId: string,
  status: 'DELIVERED' | 'READ'
): Promise<void> {
  const updateData: any = { status, updatedAt: new Date() };

  if (status === 'DELIVERED') {
    updateData.deliveredAt = new Date();
  } else if (status === 'READ') {
    updateData.readAt = new Date();
  }

  await prisma.message.updateMany({
    where: {
      whatsappMessageId: messageId,
    },
    data: updateData,
  });
}
