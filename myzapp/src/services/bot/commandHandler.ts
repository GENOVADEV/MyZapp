// src/services/bot/commandHandler.ts
import { WASocket, proto, WAMessage } from '@whiskeysockets/baileys';
import { prisma } from '@/lib/prisma';
import { getUserLimits } from '@/lib/permissions/planConfig';

// Fonction utilitaire pour extraire le texte d'un message Baileys (très capricieux)
function extractTextFromMessage(msg: proto.IMessage | null | undefined): string {
    if (!msg) return '';
    return msg.conversation || 
           msg.extendedTextMessage?.text || 
           msg.imageMessage?.caption || 
           msg.videoMessage?.caption || 
           '';
}

export async function handleBotCommand(
    sock: WASocket, 
    msg: WAMessage, 
    realUserid: string
) {
    // 1. Récupérer le texte du message
    const messageText = extractTextFromMessage(msg.message);
    
    // 2. Vérifier si c'est une commande (commence par ".")
    if (!messageText.startsWith('.')) return;

    // 3. Parser la commande (".translatefr" -> command: "translatefr", args: [])
    const args = messageText.slice(1).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();
    
    if (!command) return;

    // 4. Récupérer les infos de l'utilisateur en BDD pour les permissions
    const dbUser = await prisma.user.findUnique({
        where: { id: realUserid },
        select: { plan: true }
    });
    const limits = getUserLimits(dbUser?.plan || "FREE");

    if (!msg.key?.remoteJid) return;
    const remoteJid = msg.key.remoteJid;

    // ========================================================================
    // 🔀 ROUTEUR DES COMMANDES
    // ========================================================================
    try {
        switch (command) {
            case 'translatefr':
            case 'tfr': // Un petit raccourci c'est toujours sympa
                // await handleTranslateCommand(sock, msg, remoteJid, limits, 'fr');
                break;
                
            // case 'translatetr':
            //     await handleTranslateCommand(sock, msg, remoteJid, limits, 'tr');
            //     break;

            case 'ping':
                await sock.sendMessage(remoteJid, { text: 'Pong! 🏓 Mon forfait est : ' + dbUser?.plan }, { quoted: msg });
                break;

            default:
                // Commande inconnue, on l'ignore silencieusement
                break;
        }
    } catch (error) {
        console.error(`❌ Erreur lors de l'exécution de la commande ${command}:`, error);
        await sock.sendMessage(remoteJid, { text: '❌ Oups, une erreur est survenue lors de l\'exécution de la commande.' }, { quoted: msg });
    }
}