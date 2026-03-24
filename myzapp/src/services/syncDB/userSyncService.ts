// // src/services/syncDB/userSyncService.ts
// import { prisma } from '@/lib/prisma';

// // Types pour l'utilisateur WhatsApp (basés sur Baileys)
// interface WhatsAppUser {
//   id: string; // Format: 1234567890@s.whatsapp.net
//   name?: string;
//   phone?: string;
//   imgUrl?: string;
//   status?: string;
//   verifiedName?: string;
//   shortName?: string;
//   notify?: string;
// }

// interface SyncResult {
//   success: boolean;
//   synced: boolean;
//   errors: string[];
//   user?: any;
//   stats: {
//     phoneUpdated: boolean;
//     nameUpdated: boolean;
//     avatarUpdated: boolean;
//     whatsappConnected: boolean;
//   };
// }

// /**
//  * Synchronise les données utilisateur WhatsApp avec le profil de l'application
//  */
// export async function syncUserData(
//   whatsappUser: WhatsAppUser, 
//   userId: string
// ): Promise<SyncResult> {
//   const result: SyncResult = {
//     success: true,
//     synced: false,
//     errors: [],
//     stats: {
//       phoneUpdated: false,
//       nameUpdated: false,
//       avatarUpdated: false,
//       whatsappConnected: true
//     }
//   };

//   try {
//     // Valider les données utilisateur
//     if (!whatsappUser?.id) {
//       throw new Error('Données utilisateur WhatsApp invalides');
//     }

//     // Extraire le numéro de téléphone de l'ID WhatsApp
//     const whatsappPhone = extractPhoneNumber(whatsappUser.id);
//     if (!whatsappPhone) {
//       throw new Error('Impossible d\'extraire le numéro de téléphone WhatsApp');
//     }

//     // Récupérer l'utilisateur actuel
//     const currentUser = await prisma.user.findUnique({
//       where: { id: userId },
//       select: {
//         id: true,
//         phone: true,
//         name: true,
//         image: true,
//         phoneVerified: true,
//       }
//     });

//     if (!currentUser) {
//       throw new Error('Utilisateur non trouvé');
//     }

//     // Préparer les données de mise à jour
//     const updateData: any = {
//       whatsappConnected: true,
//       whatsappId: whatsappUser.id,
//       lastWhatsappSync: new Date(),
//       updatedAt: new Date()
//     };

//     // Mettre à jour le numéro de téléphone si différent et non vérifié
//     if (whatsappPhone !== currentUser.phone && !currentUser.phoneVerified) {
//       updateData.phone = whatsappPhone;
//       updateData.phoneVerified = new Date();
//       result.stats.phoneUpdated = true;
//     }

//     // Mettre à jour le nom si WhatsApp fournit un meilleur nom
//     const whatsappName = determineUserName(whatsappUser);
//     if (shouldUpdateName(currentUser.name, whatsappName)) {
//       updateData.name = whatsappName;
//       result.stats.nameUpdated = true;
//     }

//     // Mettre à jour l'avatar si WhatsApp en fournit un
//     if (whatsappUser.imgUrl && whatsappUser.imgUrl !== currentUser.image) {
//       updateData.image = whatsappUser.imgUrl;
//       result.stats.avatarUpdated = true;
//     }

//     // Mettre à jour l'utilisateur
//     const updatedUser = await prisma.user.update({
//       where: { id: userId },
//       data: updateData,
//       select: {
//         id: true,
//         name: true,
//         email: true,
//         phone: true,
//         image: true,
//         phoneVerified: true,
//         whatsappConnected: true,
//         whatsappId: true,
//         lastWhatsappSync: true,
//         plan: true,
//         role: true,
//         createdAt: true,
//         updatedAt: true
//       }
//     });

//     // Créer ou mettre à jour l'appareil WhatsApp
//     await syncWhatsAppDevice(whatsappUser, userId);

//     // Créer un log d'audit pour la synchronisation
//     await createAuditLog(userId, 'whatsapp_sync', 'User', userId, {
//       whatsappId: whatsappUser.id,
//       changes: {
//         phoneUpdated: result.stats.phoneUpdated,
//         nameUpdated: result.stats.nameUpdated,
//         avatarUpdated: result.stats.avatarUpdated
//       }
//     });

//     result.synced = true;
//     result.user = updatedUser;

//   } catch (error) {
//     result.success = false;
//     result.errors.push((error as Error).message);
//   }

//   return result;
// }

// /**
//  * Extrait le numéro de téléphone de l'ID WhatsApp
//  */
// function extractPhoneNumber(whatsappId: string): string | null {
//   try {
//     const phoneMatch = whatsappId.match(/^(\d+)@/);
//     if (!phoneMatch) return null;
    
//     const phone = phoneMatch[1];
    
//     // Validation basique
//     if (phone.length < 8 || phone.length > 15) return null;
    
//     return phone;
//   } catch {
//     return null;
//   }
// }

// /**
//  * Détermine le meilleur nom à utiliser
//  */
// function determineUserName(whatsappUser: WhatsAppUser): string {
//   return (
//     whatsappUser.verifiedName || 
//     whatsappUser.name || 
//     whatsappUser.notify || 
//     whatsappUser.shortName || 
//     'Utilisateur WhatsApp'
//   );
// }

// /**
//  * Détermine si le nom doit être mis à jour
//  */
// function shouldUpdateName(currentName: string | null, whatsappName: string): boolean {
//   if (!currentName) return true;
//   if (currentName === 'Utilisateur' || currentName === 'User') return true;
//   if (whatsappName.length > currentName.length) return true;
//   return false;
// }

// /**
//  * Synchronise l'appareil WhatsApp
//  */
// async function syncWhatsAppDevice(whatsappUser: WhatsAppUser, userId: string) {
//   try {
//     await prisma.device.upsert({
//       where: {
//         userId_deviceType: {
//           userId,
//           deviceType: 'MOBILE'
//         }
//       },
//       update: {
//         deviceName: 'WhatsApp',
//         lastSeenAt: new Date(),
//         isActive: true,
//         platform: 'WhatsApp',
//         appVersion: 'Latest',
//         updatedAt: new Date()
//       },
//       create: {
//         userId,
//         deviceName: 'WhatsApp',
//         deviceType: 'MOBILE',
//         platform: 'WhatsApp',
//         appVersion: 'Latest',
//         isActive: true,
//         lastSeenAt: new Date()
//       }
//     });
//   } catch (error) {
//     console.error('Erreur synchronisation appareil WhatsApp:', error);
//   }
// }

// /**
//  * Crée un log d'audit
//  */
// async function createAuditLog(
//   userId: string, 
//   action: string, 
//   entity: string, 
//   entityId: string, 
//   metadata?: any
// ) {
//   try {
//     await prisma.auditLog.create({
//       data: {
//         userId,
//         action,
//         entity,
//         entityId,
//         metadata,
//         createdAt: new Date()
//       }
//     });
//   } catch (error) {
//     console.error('Erreur création log audit:', error);
//   }
// }

// /**
//  * Service pour la gestion multi-comptes utilisateur
//  */
// export class UserSyncManager {
//   /**
//    * Synchronise les données de plusieurs comptes WhatsApp pour un utilisateur
//    */
//   static async syncMultipleAccounts(whatsappUsers: WhatsAppUser[], userId: string) {
//     const results = [];
    
//     for (const whatsappUser of whatsappUsers) {
//       try {
//         const result = await syncUserData(whatsappUser, userId);
//         results.push({
//           whatsappId: whatsappUser.id,
//           success: result.success,
//           synced: result.synced,
//           errors: result.errors
//         });
//       } catch (error) {
//         results.push({
//           whatsappId: whatsappUser.id,
//           success: false,
//           synced: false,
//           errors: [(error as Error).message]
//         });
//       }
//     }

//     return results;
//   }

//   /**
//    * Vérifie le statut de connexion WhatsApp de l'utilisateur
//    */
//   static async getWhatsAppStatus(userId: string) {
//     const user = await prisma.user.findUnique({
//       where: { id: userId },
//       select: {
//         id: true,
//         whatsappConnected: true,
//         whatsappId: true,
//         lastWhatsappSync: true,
//         phone: true,
//         phoneVerified: true,
//         devices: {
//           where: { 
//             deviceType: 'MOBILE',
//             platform: 'WhatsApp',
//             isActive: true 
//           },
//           orderBy: { lastSeenAt: 'desc' },
//           take: 1
//         }
//       }
//     });

//     return {
//       connected: user?.whatsappConnected || false,
//       whatsappId: user?.whatsappId,
//       lastSync: user?.lastWhatsappSync,
//       phone: user?.phone,
//       phoneVerified: !!user?.phoneVerified,
//       activeDevice: user?.devices[0] || null,
//       status: user?.whatsappConnected ? 'connected' : 'disconnected'
//     };
//   }

//   /**
//    * Déconnecte WhatsApp de l'utilisateur
//    */
//   static async disconnectWhatsApp(userId: string) {
//     const user = await prisma.user.update({
//       where: { id: userId },
//       data: {
//         whatsappConnected: false,
//         whatsappId: null,
//         lastWhatsappSync: null,
//         updatedAt: new Date()
//       },
//       select: {
//         id: true,
//         name: true,
//         whatsappConnected: true
//       }
//     });

//     // Désactiver l'appareil WhatsApp
//     await prisma.device.updateMany({
//       where: { 
//         userId,
//         platform: 'WhatsApp'
//       },
//       data: {
//         isActive: false,
//         updatedAt: new Date()
//       }
//     });

//     // Log d'audit
//     await createAuditLog(userId, 'whatsapp_disconnect', 'User', userId);

//     return user;
//   }

//   /**
//    * Récupère l'historique des synchronisations WhatsApp
//    */
//   static async getSyncHistory(userId: string, limit: number = 10) {
//     const auditLogs = await prisma.auditLog.findMany({
//       where: {
//         userId,
//         action: { in: ['whatsapp_sync', 'whatsapp_disconnect'] }
//       },
//       orderBy: { createdAt: 'desc' },
//       take: limit
//     });

//     return auditLogs.map(log => ({
//       action: log.action,
//       timestamp: log.createdAt,
//       metadata: log.metadata
//     }));
//   }
// }

// /**
//  * Hook React pour la synchronisation utilisateur (FRONTEND)
//  */
// export function useUserSync() {
//   const syncUserData = async (whatsappUser: any) => {
//     const response = await fetch('/api/bot/user/sync', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ user: whatsappUser })
//     });
    
//     return await response.json();
//   };

//   const getWhatsAppStatus = async () => {
//     const response = await fetch('/api/bot/user/whatsapp-status');
//     return await response.json();
//   };

//   const disconnectWhatsApp = async () => {
//     const response = await fetch('/api/bot/user/disconnect-whatsapp', {
//       method: 'POST'
//     });
//     return await response.json();
//   };

//   return {
//     syncUserData,
//     getWhatsAppStatus,
//     disconnectWhatsApp
//   };
// }
