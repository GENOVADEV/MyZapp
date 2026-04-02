// src/services/syncDB/userSyncService.ts
import { prisma } from '@/lib/prisma';
import type { Contact as WAContact } from '@whiskeysockets/baileys';

interface WhatsAppUser {
  id: string;
  name?: string;
  notify?: string;
  verifiedName?: string;
  imgUrl?: string;
  status?: string;
  platform?: string;
  device?: string;
  pushname?: string;
}

interface SyncUserResult {
  success: boolean;
  synced: boolean;
  errors: string[];
  user?: any;
  stats: {
    phoneUpdated: boolean;
    nameUpdated: boolean;
    avatarUpdated: boolean;
    whatsappConnected: boolean;
    statusUpdated: boolean;
    deviceUpdated: boolean;
  };
}

/**
 * Synchronise les données utilisateur WhatsApp avec la DB
 */
export async function syncUserData(
  whatsappUser: WhatsAppUser,
  userId: string
): Promise<SyncUserResult> {
  const errors: string[] = [];
  const stats = {
    phoneUpdated: false,
    nameUpdated: false,
    avatarUpdated: false,
    whatsappConnected: false,
    statusUpdated: false,
    deviceUpdated: false,
  };

  try {
    // Extraire le numéro de téléphone du JID WhatsApp
    // Format: 237612345678@s.whatsapp.net ou 237612345678:45@s.whatsapp.net
    const phone = whatsappUser.id.split('@')[0].split(':')[0];

    // Préparer les données de mise à jour
    const updateData: any = {
      whatsappConnected: true,
      whatsappId: whatsappUser.id,
      lastWhatsappSync: new Date(),
      lastSyncAt: new Date(),
    };

    // Mise à jour du téléphone si absent
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, name: true, image: true },
    });

    if (!user) {
      errors.push('Utilisateur introuvable');
      return { success: false, synced: false, errors, stats };
    }

    // Téléphone
    if (!user.phone && phone) {
      updateData.phone = phone;
      updateData.phoneVerified = new Date();
      stats.phoneUpdated = true;
    }

    // Nom (priorité: verifiedName > notify > name > pushname)
    const whatsappName =
      whatsappUser.verifiedName ||
      whatsappUser.notify ||
      whatsappUser.name ||
      whatsappUser.pushname;

    if (!user.name && whatsappName) {
      updateData.name = whatsappName;
      stats.nameUpdated = true;
    }

    // Avatar
    if (!user.image && whatsappUser.imgUrl) {
      updateData.image = whatsappUser.imgUrl;
      stats.avatarUpdated = true;
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        image: true,
        whatsappConnected: true,
        whatsappId: true,
        lastWhatsappSync: true,
      },
    });

    stats.whatsappConnected = true;

    // Synchroniser le statut si disponible
    if (whatsappUser.status) {
      try {
        await syncUserStatus(userId, whatsappUser.status);
        stats.statusUpdated = true;
      } catch (error) {
        errors.push(`Erreur sync statut: ${error}`);
      }
    }

    // Synchroniser les informations de l'appareil
    if (whatsappUser.platform || whatsappUser.device) {
      try {
        await syncUserDevice(userId, {
          platform: whatsappUser.platform,
          device: whatsappUser.device,
        });
        stats.deviceUpdated = true;
      } catch (error) {
        errors.push(`Erreur sync appareil: ${error}`);
      }
    }

    console.log(`✅ Utilisateur ${userId} synchronisé avec WhatsApp`);

    return {
      success: true,
      synced: true,
      errors,
      user: updatedUser,
      stats,
    };
  } catch (error) {
    console.error('❌ Erreur synchronisation utilisateur:', error);
    errors.push(`Erreur DB: ${error}`);
    return { success: false, synced: false, errors, stats };
  }
}

/**
 * Synchronise le statut utilisateur
 */
async function syncUserStatus(userId: string, status: string): Promise<void> {
  // Créer ou mettre à jour un champ de statut WhatsApp
  // Note: Vous devrez peut-être ajouter un champ `whatsappStatus` à votre modèle User
  await prisma.user.update({
    where: { id: userId },
    data: {
      // whatsappStatus: status, // Ajoutez ce champ au modèle si nécessaire
      updatedAt: new Date(),
    },
  });
}

/**
 * Synchronise les informations de l'appareil
 */
async function syncUserDevice(
  userId: string,
  deviceInfo: { platform?: string; device?: string }
): Promise<void> {
  const { platform, device } = deviceInfo;

  // Vérifier si un appareil WhatsApp existe déjà
  const existingDevice = await prisma.device.findFirst({
    where: {
      userId,
      deviceType: 'MOBILE', // ou 'DESKTOP' selon le cas
      platform: platform || undefined,
    },
  });

  if (existingDevice) {
    // Mettre à jour l'appareil existant
    await prisma.device.update({
      where: { id: existingDevice.id },
      data: {
        deviceName: device || existingDevice.deviceName,
        platform: platform || existingDevice.platform,
        isActive: true,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } else {
    // Créer un nouvel appareil
    await prisma.device.create({
      data: {
        userId,
        deviceName: device || 'WhatsApp Device',
        deviceType: platform?.toLowerCase().includes('web') ? 'WEB' : 'MOBILE',
        platform: platform || 'WhatsApp',
        isActive: true,
        lastSeenAt: new Date(),
      },
    });
  }
}

/**
 * Met à jour des champs spécifiques de l'utilisateur
 */
export async function updateUserFields(
  userId: string,
  fields: Partial<{
    whatsappConnected: boolean;
    whatsappId: string | null;
    lastWhatsappSync: Date | null;
  }>
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...fields,
      updatedAt: new Date(),
    },
  });
}

/**
 * Déconnecte WhatsApp pour un utilisateur
 */
export async function disconnectWhatsApp(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      whatsappConnected: false,
      whatsappId: null,
      updatedAt: new Date(),
    },
  });

  // Désactiver tous les appareils WhatsApp
  await prisma.device.updateMany({
    where: {
      userId,
      platform: { contains: 'WhatsApp' },
    },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  });
}

/**
 * Récupère le statut WhatsApp d'un utilisateur
 */
export async function getWhatsAppStatus(userId: string): Promise<{
  connected: boolean;
  whatsappId: string | null;
  lastSync: Date | null;
  phone: string | null;
  phoneVerified: boolean;
  activeDevice: any | null;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      whatsappConnected: true,
      whatsappId: true,
      lastWhatsappSync: true,
      phone: true,
      phoneVerified: true,
      devices: {
        where: {
          isActive: true,
          platform: { contains: 'WhatsApp' },
        },
        orderBy: { lastSeenAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!user) {
    throw new Error('Utilisateur introuvable');
  }

  return {
    connected: user.whatsappConnected,
    whatsappId: user.whatsappId,
    lastSync: user.lastWhatsappSync,
    phone: user.phone,
    phoneVerified: !!user.phoneVerified,
    activeDevice: user.devices[0] || null,
  };
}
