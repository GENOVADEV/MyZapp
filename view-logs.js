#!/usr/bin/env node

/**
 * Script pour consulter les logs du bot WhatsApp
 * Usage: node view-logs.js [options]
 */

const fs = require('fs');
const path = require('path');

const logsFolder = path.join(__dirname, 'logs');

// Fonction pour afficher l'aide
function showHelp() {
    console.log(`
📊 VISUALISEUR DE LOGS - BOT WHATSAPP

Usage: node view-logs.js [options]

Options:
  --today           Afficher les logs d'aujourd'hui uniquement
  --date YYYY-MM-DD Afficher les logs d'une date spécifique
  --viewonce        Afficher uniquement les vues uniques
  --sender NUMERO   Filtrer par expéditeur (ex: 237612345678)
  --type TYPE       Filtrer par type (TEXT, IMAGE, VIDEO, etc.)
  --stats           Afficher des statistiques
  --help            Afficher cette aide

Exemples:
  node view-logs.js --today
  node view-logs.js --date 2025-03-21
  node view-logs.js --viewonce
  node view-logs.js --sender 237612345678 --today
  node view-logs.js --stats
    `);
}

// Parser les arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.length === 0) {
    showHelp();
    process.exit(0);
}

// Déterminer le fichier de log à lire
let logFile;
if (args.includes('--today')) {
    const today = new Date().toISOString().split('T')[0];
    logFile = path.join(logsFolder, `messages_${today}.log`);
} else if (args.includes('--date')) {
    const dateIndex = args.indexOf('--date');
    const date = args[dateIndex + 1];
    logFile = path.join(logsFolder, `messages_${date}.log`);
} else {
    // Prendre le fichier le plus récent
    if (!fs.existsSync(logsFolder)) {
        console.error('❌ Dossier logs/ introuvable');
        process.exit(1);
    }
    
    const files = fs.readdirSync(logsFolder)
        .filter(f => f.startsWith('messages_') && f.endsWith('.log'))
        .sort()
        .reverse();
    
    if (files.length === 0) {
        console.error('❌ Aucun fichier de log trouvé');
        process.exit(1);
    }
    
    logFile = path.join(logsFolder, files[0]);
}

// Vérifier que le fichier existe
if (!fs.existsSync(logFile)) {
    console.error(`❌ Fichier non trouvé: ${logFile}`);
    process.exit(1);
}

// Lire et parser les logs
const content = fs.readFileSync(logFile, 'utf8');
const lines = content.trim().split('\n').filter(l => l);
let logs = lines.map(line => {
    try {
        return JSON.parse(line);
    } catch (e) {
        return null;
    }
}).filter(l => l !== null);

// Appliquer les filtres
if (args.includes('--viewonce')) {
    logs = logs.filter(log => log.isViewOnce);
}

if (args.includes('--sender')) {
    const senderIndex = args.indexOf('--sender');
    const sender = args[senderIndex + 1];
    logs = logs.filter(log => log.sender === sender);
}

if (args.includes('--type')) {
    const typeIndex = args.indexOf('--type');
    const type = args[typeIndex + 1].toUpperCase();
    logs = logs.filter(log => log.messageType === type);
}

// Mode statistiques
if (args.includes('--stats')) {
    console.log(`\n📊 STATISTIQUES - ${path.basename(logFile)}\n`);
    
    const total = logs.length;
    const incoming = logs.filter(l => l.direction === 'IN').length;
    const outgoing = logs.filter(l => l.direction === 'OUT').length;
    const viewOnce = logs.filter(l => l.isViewOnce).length;
    
    console.log(`📈 Total de messages : ${total}`);
    console.log(`📥 Entrants : ${incoming} (${(incoming/total*100).toFixed(1)}%)`);
    console.log(`📤 Sortants : ${outgoing} (${(outgoing/total*100).toFixed(1)}%)`);
    console.log(`👀 Vues uniques : ${viewOnce} (${(viewOnce/total*100).toFixed(1)}%)`);
    
    // Top expéditeurs
    const senders = {};
    logs.forEach(log => {
        if (log.direction === 'IN') {
            senders[log.sender] = (senders[log.sender] || 0) + 1;
        }
    });
    
    console.log('\n👥 Top 5 expéditeurs :');
    Object.entries(senders)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([sender, count], i) => {
            console.log(`   ${i+1}. ${sender} : ${count} messages`);
        });
    
    // Types de messages
    const types = {};
    logs.forEach(log => {
        types[log.messageType] = (types[log.messageType] || 0) + 1;
    });
    
    console.log('\n📊 Types de messages :');
    Object.entries(types)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
            console.log(`   ${type} : ${count}`);
        });
    
    console.log('');
    process.exit(0);
}

// Affichage normal
console.log(`\n📋 LOGS - ${path.basename(logFile)}`);
console.log(`   Total: ${logs.length} messages\n`);

logs.forEach(log => {
    const icon = log.direction === 'IN' ? '📥' : '📤';
    const viewOnceTag = log.isViewOnce ? ' 👀' : '';
    const time = new Date(log.timestamp).toLocaleTimeString('fr-FR');
    
    console.log(`${icon} [${time}] ${log.sender} - ${log.messageType}${viewOnceTag}`);
    if (log.content && log.content !== '[Média]') {
        console.log(`   💬 ${log.content}`);
    }
});

console.log('');
