// src/services/syncDB/broadcastSyncService.ts

import { prisma } from '@/lib/prisma';
import type { proto } from '@whiskeysockets/baileys';
import { createMediaFileFromMessage } from './messageSyncService';

type WAMessage = proto.IWebMessageInfo;

export async function syncBroadcasts(
  whatsappMessages: WAMessage[],
  userId: string
) {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const waMsg of whatsappMessages) {
    try {
      const key = waMsg.key;

      // ✅ On ne garde que les status
      if (key?.remoteJid !== 'status@broadcast') {
        skipped++;
        continue;
      }

      if (!waMsg.message || !key.id) {
        skipped++;
        continue;
      }

      const messageId = key.id;

      // 📅 timestamp
      const messageDate = waMsg.messageTimestamp
        ? new Date(Number(waMsg.messageTimestamp) * 1000)
        : new Date();

      // 👤 sender
      const senderJid = key.participant || waMsg.participant || '';

      // 🧠 contenu
      const { content, type, mediaInfo } = extractBroadcastContent(waMsg);

      // 👀 viewers
      const viewers = waMsg.userReceipt?.map(r => r.userJid) || [];

      const messageData: any = {
        userId,
        whatsappMessageId: messageId,
        senderJid,
        chatJid: key.remoteJid,

        type,
        content,
        rawMessage: waMsg.message,

        viewers,
        viewCount: viewers.length,

        isEphemeral: true,
        expiresAt: new Date(messageDate.getTime() + 24 * 60 * 60 * 1000),

        whatsappTimestamp: messageDate,
      };

      // 📎 media
      if (mediaInfo?.hasMedia) {
        const mediaFile = await createMediaFileFromMessage(
          waMsg,
          userId,
          mediaInfo
        );

        if (mediaFile) {
          messageData.mediaFileId = mediaFile.id;
        }
      }

      // 🔍 existant ?
      const existing = await prisma.broadcast.findUnique({
        where: { whatsappMessageId: messageId },
      });

      if (existing) {
        await prisma.broadcast.update({
          where: { id: existing.id },
          data: messageData,
        });
        updated++;
      } else {
        await prisma.broadcast.create({
          data: messageData,
        });
        created++;
      }

    } catch (error) {
      console.error('❌ broadcast sync error:', error);
    }
  }

  function extractBroadcastContent(waMsg: WAMessage) {
  let msg = waMsg.message;

  if (!msg) {
    return { content: null, type: 'SYSTEM', mediaInfo: null };
  }

  // unwrap Baileys
  if (msg?.ephemeralMessage?.message) msg = msg.ephemeralMessage.message;
  if (msg?.viewOnceMessage?.message) msg = msg.viewOnceMessage.message;

  if (msg.conversation) {
    return { content: msg.conversation, type: 'TEXT', mediaInfo: null };
  }

  if (msg.extendedTextMessage) {
    return {
      content: msg.extendedTextMessage.text || null,
      type: 'TEXT',
      mediaInfo: null,
    };
  }

  if (msg.imageMessage) {
    return {
      content: msg.imageMessage.caption || null,
      type: 'IMAGE',
      mediaInfo: { hasMedia: true, mediaType: 'IMAGE' },
    };
  }

  if (msg.videoMessage) {
    return {
      content: msg.videoMessage.caption || null,
      type: 'VIDEO',
      mediaInfo: { hasMedia: true, mediaType: 'VIDEO' },
    };
  }

  return { content: null, type: 'TEXT', mediaInfo: null };
}

  console.log(`✅ Broadcast sync: ${created} created, ${updated} updated, ${skipped} skipped`);

  return { created, updated, skipped };
}