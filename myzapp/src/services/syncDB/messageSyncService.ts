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

export function bufferToBase64(buffer: Uint8Array | Buffer | null | undefined): string | null {
  if (!buffer) return null;
  return Buffer.from(buffer).toString('base64');
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
    // ❌ Skip messages invalides
    if (!waMsg.message || !waMsg.key?.remoteJid) {
      stats.skipped++;
      continue;
    }

    const messageId = waMsg.key.id;
    const chatJid = waMsg.key.remoteJid;
    const fromMe = waMsg.key.fromMe || false;

    if (!messageId) {
      stats.skipped++;
      continue;
    }

    // 📅 Timestamp clean
    const messageDate = waMsg.messageTimestamp
      ? new Date(Number(waMsg.messageTimestamp) * 1000)
      : new Date();

    // 👥 participant (groupes)
    const participantJid = waMsg.participant || waMsg.key.participant || null;

    // 💬 conversation (inchangé)
    let conversation = await prisma.conversation.findFirst({
      where: { userId, whatsappId: chatJid },
      select: { id: true },
    });

    if (!conversation) {
      const isGroup = chatJid.includes('@g.us');
      const isBroadcast = chatJid.includes('status@broadcast');

      try {
        conversation = await prisma.conversation.create({
          data: {
            userId,
            whatsappId: chatJid,
            type: isGroup ? 'GROUP' : 'DIRECT',
            isBroadcast: isBroadcast ? true : false,
            unreadCount: fromMe ? 0 : 1,
            lastMessageAt: messageDate,
          },
          select: { id: true }
        });
      } catch (error: any) {
        if (error.code === 'P2002') {
          conversation = await prisma.conversation.findFirst({
            where: { userId, whatsappId: chatJid },
            select: { id: true }
          });
          if (!conversation) continue;
        } else {
          stats.skipped++;
          continue;
        }
      }
    }

    // 🧠 contenu principal
    const { content, type, mediaInfo } = extractMessageContent(waMsg);

    const senderId = fromMe
      ? userId
      : await getSenderIdFromMessage(waMsg, userId);

    // 🔁 context info (IMPORTANT)
    const contextInfo = waMsg.message?.extendedTextMessage?.contextInfo
      || waMsg.message?.imageMessage?.contextInfo
      || waMsg.message?.videoMessage?.contextInfo;

    // 📌 reply
    let replyToId = null;
    if (contextInfo?.stanzaId) {
      const reply = await prisma.message.findFirst({
        where: {
          conversationId: conversation.id,
          whatsappMessageId: contextInfo.stanzaId,
        },
        select: { id: true },
      });
      replyToId = reply?.id;
    }

    // 🔁 forward
    const isForwarded = contextInfo?.isForwarded || false;
    const forwardCount = contextInfo?.forwardingScore || 0;

    // ⏳ ephemeral
    const ephemeralDuration = waMsg.ephemeralDuration || null;
    const ephemeralStart = waMsg.ephemeralStartTimestamp
      ? new Date(Number(waMsg.ephemeralStartTimestamp) * 1000)
      : null;

    // 📦 DATA COMPLET
    const messageData: any = {
      whatsappMessageId: messageId,
      chatJid,
      senderJid: participantJid || chatJid,
      participantJid,

      conversationId: conversation.id,
      senderId,

      type,
      content,

      rawMessage: waMsg.message, // 🔥 FULL PAYLOAD

      status: fromMe ? getMessageStatus(waMsg) : 'DELIVERY_ACK',

      createdAt: messageDate,
      whatsappTimestamp: messageDate,

      // flags
      fromMe,
      isStarred: waMsg.starred || false,
      isBroadcast: waMsg.broadcast || false,
      isMulticast: waMsg.multicast || false,

      // reply / forward
      replyToId,
      forwardCount,
      isForwarded,

      // ephemeral
      isEphemeral: !!ephemeralDuration,
      ephemeralDuration,
      ephemeralStart,

      // metadata
      stubType: waMsg.messageStubType || null,
      stubParameters: waMsg.messageStubParameters || [],
      labels: waMsg.labels || [],

      // media avancé
      mediaData: waMsg.mediaData || null,
      mediaCipherSha256: waMsg.mediaCiphertextSha256 || null,

      // business / bot
      verifiedBizName: waMsg.verifiedBizName || null,
      botInvokerJid: waMsg.botMessageInvokerJid || null,

      // sécurité
      messageSecret: waMsg.messageSecret || null,

      // JSON avancé
      userReceipts: waMsg.userReceipt || [],
      pollData: waMsg.pollUpdates || null,
      paymentInfo: waMsg.paymentInfo || null,
      liveLocation: waMsg.finalLiveLocation || null,
    };

    // 📎 MEDIA
    if (mediaInfo?.hasMedia) {
      const mediaFile = await createMediaFileFromMessage(waMsg, userId, mediaInfo);
      if (mediaFile) {
        messageData.mediaFileId = mediaFile.id;
      }
    }

    // 🔍 check existant
    const existingMessage = await prisma.message.findFirst({
      where: {
        conversationId: conversation.id,
        whatsappMessageId: messageId,
      },
    });

    if (existingMessage) {
      await prisma.message.update({
        where: { id: existingMessage.id },
        data: messageData,
      });
      stats.updated++;
    } else {
      const createdMessage = await prisma.message.create({
        data: messageData,
      });

      // 😀 réactions
      if (waMsg.reactions?.length) {
        await prisma.reaction.createMany({
          data: waMsg.reactions.map((r: any) => ({
            messageId: createdMessage.id,
            userId: r.key?.participant || '',
            emoji: r.text || '',
          })),
          skipDuplicates: true,
        });
      }

      stats.created++;

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: messageDate,
          updatedAt: new Date(),
        },
      });
    }

  } catch (error) {
    console.error(`❌ Erreur sync message:`, error);
    stats.failed++;
  }
}

  const synced = stats.created + stats.updated;

  console.log(
    `✅ Synchronisation messages terminée: ${synced}/${stats.total} (${stats.created} créés, ${stats.updated} mis à jour)`
  );

  // 🚨 AFFICHER LES ERREURS PRISMA S'IL Y EN A
  if (errors.length > 0) {
    console.error("❌ DÉTAIL DES ERREURS DE SAUVEGARDE MESSAGES :");
    errors.forEach(e => console.error(e));
  }

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
  let msg = waMsg.message;

  if (!msg) {
    return { content: null, type: 'SYSTEM', mediaInfo: null };
  }


  // 🛠️ LE FAMEUX DÉBALLAGE BAILEYS : On retire les couches de protection
  if (msg?.ephemeralMessage?.message) {
    msg = msg.ephemeralMessage.message;
  }
  if (msg?.viewOnceMessage?.message) {
    msg = msg?.viewOnceMessage.message;
  }
  if (msg?.viewOnceMessageV2?.message) {
    msg = msg?.viewOnceMessageV2.message;
  }
  if (msg?.documentWithCaptionMessage?.message) {
    msg = msg?.documentWithCaptionMessage.message;
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

  if (msg.reactionMessage) {
    return { content: msg.reactionMessage.text ?? null, type: 'REACTION', mediaInfo: null };
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
      return 'ERROR';
    case 1:
      return 'PENDING';
    case 2:
      return 'SERVER_ACK';
    case 3:
      return 'DELIVERY_ACK';
    case 4:
      return 'READ';
    case 5:
      return 'PLAYED';
    default:
      return 'PENDING';
  }
}

/**
 * Récupère l'ID de l'expéditeur depuis un message
 */
async function getSenderIdFromMessage(
  waMsg: WAMessage,
  userId: string
): Promise<string> {
  const key = waMsg.key;

  // Si le message est envoyé par nous-même
  if (key?.fromMe) {
    return userId;
  }

  let senderJid: string | undefined;

  // Cas des groupes → participant contient l’expéditeur réel
  if (key?.remoteJid?.endsWith('@g.us')) {
    senderJid = key?.participant || waMsg.participant || '';
  } else {
    // Cas des chats privés
    senderJid = key?.remoteJid || '';
  }

  if (!senderJid) {
    return userId;
  }

  // Nettoyage du numéro (enlève @s.whatsapp.net, :device, etc.)
  const senderPhone = senderJid.split('@')[0].split(':')[0];

  // Recherche du contact
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
export async function createMediaFileFromMessage(
  waMsg: WAMessage,
  userId: string,
  mediaInfo: { mediaType?: string }
): Promise<any | null> {
  try {
    const msg = waMsg.message;
    let mediaMessage: any;
    let fileName: string;
    let mimeType: string;
    let fileHash: string;
    let fileEncSha: string;
    let mediaKey: string;
    let originalPath: string;
    let url: string;
    let viewOnce: boolean = false;
    let width: number | undefined;
    let height: number | undefined;
    let fileSize: number = 0;
    let duration: number | undefined;
    let waveForm: string | undefined;


    if (msg?.imageMessage) {
      mediaMessage = msg.imageMessage;
      fileName = `image_${Date.now()}.jpg`;
      mimeType = mediaMessage.mimetype || 'image/jpeg';
      fileHash = bufferToBase64(mediaMessage.fileSha256) || '';
      fileEncSha = bufferToBase64(mediaMessage.fileEncSha256) || '';
      mediaKey = bufferToBase64(mediaMessage.mediaKey) || '';
      originalPath = mediaMessage.directPath || '';
      url = mediaMessage.staticUrl || '';
      viewOnce = mediaMessage.viewOnce || false;
      fileSize = Number(mediaMessage.fileLength) || 0;
      width = mediaMessage.width;
      height = mediaMessage.height;
    } else if (msg?.videoMessage) {
      mediaMessage = msg.videoMessage;
      fileName = `video_${Date.now()}.mp4`;
      mimeType = mediaMessage.mimetype || 'video/mp4';
      mediaKey = bufferToBase64(mediaMessage.mediaKey) || '';
      fileEncSha = bufferToBase64(mediaMessage.fileEncSha256) || '';
      fileHash = bufferToBase64(mediaMessage.fileSha256) || '';
      originalPath = mediaMessage.directPath || '';
      url = mediaMessage.staticUrl || '';
      viewOnce = mediaMessage.viewOnce || false;
      fileSize = Number(mediaMessage.fileLength) || 0;
      width = mediaMessage.width;
      height = mediaMessage.height;
      duration = mediaMessage.seconds;
    } else if (msg?.audioMessage) {
      mediaMessage = msg.audioMessage;
      fileName = `audio_${Date.now()}.ogg`;
      mimeType = mediaMessage.mimetype || 'audio/ogg';
      mediaKey = bufferToBase64(mediaMessage.mediaKey) || '';
      fileEncSha = bufferToBase64(mediaMessage.fileEncSha256) || '';
      fileHash = bufferToBase64(mediaMessage.fileSha256) || '';
      originalPath = mediaMessage.directPath || '';
      url = mediaMessage.staticUrl || '';
      viewOnce = mediaMessage.viewOnce || false;
      fileSize = Number(mediaMessage.fileLength) || 0;
      duration = mediaMessage.seconds;
      waveForm = bufferToBase64(mediaMessage.waveform) || '';

    } else if (msg?.documentMessage) {
      mediaMessage = msg.documentMessage;
      fileName = mediaMessage.fileName || `document_${Date.now()}`;
      mimeType = mediaMessage.mimetype || 'application/octet-stream';
      mediaKey = bufferToBase64(mediaMessage.mediaKey) || '';
      fileEncSha = bufferToBase64(mediaMessage.fileEncSha256) || '',
        fileHash = bufferToBase64(mediaMessage.fileSha256) || '';
      originalPath = mediaMessage.directPath || '';
      url = mediaMessage.staticUrl || '';
      fileSize = Number(mediaMessage.fileLength) || 0;
    } else {
      return null;
    }

    if (fileHash && fileHash !== '') {
        const existingMedia = await prisma.mediaFile.findFirst({
            where: { fileHash: fileHash }
        });

        if (existingMedia) {
            // Le média (ex: sticker) existe déjà en base, on le réutilise !
            return existingMedia;
        }
    }

    // Note: L'URL sera générée lors du téléchargement réel du média
    try {
        // On crée le nouveau média
        const mediaFile = await prisma.mediaFile.create({
          data: {
            userId,
            fileName,
            fileSize,
            mimeType,
            waveForm,
            width,
            height,
            mediaKey,
            fileHash,
            fileEncSha,
            originalPath,
            url,
            viewOnce,
            duration,
            type: (mediaInfo.mediaType as any) || 'DOCUMENT',
            storagePath: `whatsapp_media/${userId}/${fileName}`,
          },
        });
        return mediaFile;
    } catch (error: any) {
        // Si deux messages envoient la même image EXACTEMENT en même temps
        if (error.code === 'P2002') {
            return await prisma.mediaFile.findFirst({ where: { fileHash: fileHash } });
        }
        console.error('❌ Erreur création média:', error);
        return null;
    }
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
  status: 'DELIVERY_ACK' | 'READ'
): Promise<void> {
  const updateData: any = { status, updatedAt: new Date() };

  if (status === 'DELIVERY_ACK') {
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
