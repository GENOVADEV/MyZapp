// src/services/bot/features/translateMsg.ts
import { WASocket, proto, WAMessage } from '@whiskeysockets/baileys';
import { prisma } from '@/lib/prisma';
import { getUserLimits } from '@/lib/permissions/planConfig';

function extractTextFromMessage(msg: proto.IMessage | null | undefined): string {
    if (!msg) return '';
    return msg.conversation || 
           msg.extendedTextMessage?.text || 
           msg.imageMessage?.caption || 
           msg.videoMessage?.caption || 
           '';
}

export async function handleTranslateCommand(
    sock: WASocket, 
    msg: WAMessage, 
    remoteJid: string, 
    limits: any, // Idéalement PlanLimits
    targetLang: string
) {
    // 1. VÉRIFICATION DES PERMISSIONS (Le Gardien !)
    if (!limits.canUseAutoTranslation) {
        await sock.sendMessage(remoteJid, { 
            text: '🔒 Oups ! Ton forfait actuel ne te permet pas d\'utiliser la traduction automatique. Mets à niveau ton compte pour débloquer cette fonctionnalité !' 
        }, { quoted: msg });
        return;
    }

    // 2. EXTRAIRE LE MESSAGE CITÉ (Quoted Message)
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const quotedMessage = contextInfo?.quotedMessage;

    if (!quotedMessage) {
        await sock.sendMessage(remoteJid, { 
            text: '⚠️ Tu dois répondre à un message spécifique avec la commande pour que je puisse le traduire !' 
        }, { quoted: msg });
        return;
    }

    const textToTranslate = extractTextFromMessage(quotedMessage);

    if (!textToTranslate) {
        await sock.sendMessage(remoteJid, { 
            text: '⚠️ Le message auquel tu as répondu ne contient pas de texte.' 
        }, { quoted: msg });
        return;
    }

    // 3. ACTION : Réagir au message pour montrer qu'on travaille (UX WhatsApp)
    await sock.sendMessage(remoteJid, { react: { text: "⏳", key: msg.key } });

    // 4. APPEL À TON API DE TRADUCTION (À implémenter)
    // const translatedText = await myTranslationService(textToTranslate, targetLang);
    const translatedText = `(Traduit en ${targetLang}) : Voici un texte traduit factice pour le moment ! -> "${textToTranslate}"`;

    // 5. ENVOYER LA RÉPONSE
    await sock.sendMessage(remoteJid, { text: translatedText }, { quoted: msg });
    
    // Remplacer l'icône de chargement par un succès
    await sock.sendMessage(remoteJid, { react: { text: "✅", key: msg.key } });
}