// src/server.ts (fichier séparé pour le développement)
import { createServer } from 'http';
import next from 'next';
import { initializeWebSocketServer } from './lib/websocket-server';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  // Initialiser le serveur WebSocket
  initializeWebSocketServer(server);

  const PORT = process.env.PORT || 3000;
  
  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
    console.log(`> WebSocket server running on ws://localhost:${PORT}`);
  });
});
