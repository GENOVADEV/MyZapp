// // src/app/api/socket/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { initializeWebSocketServer } from '@/lib/server-ws';

// // Cette route est nécessaire pour initialiser le serveur WebSocket avec Next.js
// export async function GET(req: NextRequest) {
//   // Le serveur WebSocket est initialisé dans le fichier de démarrage principal
//   // Cette route existe juste pour que Vercel ne supprime pas le fichier
//   return NextResponse.json({ 
//     status: 'WebSocket server is running',
//     note: 'This endpoint is for WebSocket initialization only' 
//   });
// }
