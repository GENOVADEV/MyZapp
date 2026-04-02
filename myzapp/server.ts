// server.ts
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { initWhatsAppSocket } from './src/lib/server-ws'; // Ajuste le chemin

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialisation de Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    // Création du serveur HTTP partagé
    const httpServer = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url!, true);
            // On laisse Next.js gérer toutes les requêtes HTTP (tes pages et tes /api)
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Erreur survenue', err);
            res.statusCode = 500;
            res.end('Erreur interne du serveur');
        }
    });

    // On attache Socket.io au MÊME serveur
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true,
        },
    });

    // On lance la logique WhatsApp
    initWhatsAppSocket(io);

    // On écoute sur le port 3000
    httpServer.listen(port, () => {
        console.log(`> 🚀 Serveur unifié prêt sur http://${hostname}:${port}`);
    });
});