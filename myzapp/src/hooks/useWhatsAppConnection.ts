// src/hooks/useWhatsAppConnection.ts
import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { whatsappService } from '@/services/MyZapp/whatsappService';
import { useAuth } from '@/contexts/AuthContext';

interface UseWhatsAppConnectionProps {
    onQrReceived?: (qr: string) => void;
    onConnected?: (user: any) => void;
    onError?: (error: string) => void;
    onDisconnected?: (reason: string) => void;
    onPairingCodeReceived?: (code: string, phone: string) => void;
}

export function useWhatsAppConnection(props?: UseWhatsAppConnectionProps) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'connecting' | 'qr_pending' | 'connected' | 'error'>('idle');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [whatsappUser, setWhatsappUser] = useState<any>(null); // Renommé pour éviter conflit
    const { user: authUser } = useAuth();
    const userId = authUser?.id;

    // Créer une nouvelle session
    const createSession = useCallback(async (method: 'qr' | 'phone', phone?: string) => {
        try {
            setStatus('connecting');
            setError(null);
            setQrCode(null);
            setPairingCode(null);
            setWhatsappUser(null);

            // 1. Créer une session via l'API REST
            const session = await whatsappService.createSession();
            const newSessionId = session.sessionId;
            setSessionId(newSessionId);

            console.log('📝 Session créée:', newSessionId);

            // 2. Déterminer l'URL WebSocket
            const wsUrl = process.env.NODE_ENV === 'production'
                ? 'wss://ton-domaine.com'  // À configurer pour la production
                : 'http://localhost:3001';

            console.log('🌐 Connexion WebSocket vers:', wsUrl);

            // 3. Se connecter au WebSocket
            const newSocket = io(wsUrl, {
                query: { sessionId: newSessionId }, // Utiliser newSessionId, pas sessionId (qui est le state)
                auth: {
                    token: typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null,
                    userId: userId
                },
                transports: ['websocket', 'polling'],
                timeout: 10000,
                reconnection: true,
                reconnectionAttempts: 3,
                reconnectionDelay: 1000
            });

            newSocket.on('connect', () => {
                console.log('✅ Connecté au serveur WebSocket');
                setStatus('qr_pending');
                
                // Authentification automatique après connexion
                newSocket.emit('authenticate', {
                    sessionId: newSessionId,
                    userId: userId
                });
            });

            newSocket.on('authenticated', (data) => {
                console.log('🔐 Authentifié avec succès:', data);
                
                // Initialiser WhatsApp APRÈS authentification
                newSocket.emit('init_whatsapp', {
                    sessionId: newSessionId,
                    method,
                    phone: phone?.replace(/[^0-9]/g, "")
                });
            });

            newSocket.on('whatsapp_event', (event) => {
                console.log('📡 Événement WhatsApp:', event.type, event.data);

                switch (event.type) {
                    case 'qr':
                        setQrCode(event.data.qr);
                        setStatus('qr_pending');
                        props?.onQrReceived?.(event.data.qr);
                        break;

                    case 'pairing_code':
                        setPairingCode(event.data.code);
                        props?.onPairingCodeReceived?.(event.data.code, event.data.phone);
                        break;

                    case 'connected':
                        setStatus('connected');
                        setQrCode(null);
                        setPairingCode(null);
                        setWhatsappUser(event.data.user);
                        props?.onConnected?.(event.data.user);
                        break;

                    case 'error':
                        setStatus('error');
                        setError(event.data.message);
                        props?.onError?.(event.data.message);
                        break;

                    case 'disconnected':
                        setStatus('idle');
                        setWhatsappUser(null);
                        props?.onDisconnected?.(event.data.reason);
                        break;

                    case 'status':
                        console.log('📊 Status update:', event.data);
                        break;
                }
            });

            newSocket.on('disconnect', (reason) => {
                console.log('🔌 Déconnecté du WebSocket:', reason);
                setStatus('idle');
                setSocket(null);
                setWhatsappUser(null);
            });

            newSocket.on('connect_error', (err) => {
                console.error('❌ Erreur de connexion WebSocket:', err);
                setStatus('error');
                const errorMsg = `Impossible de se connecter au serveur WebSocket: ${err.message}`;
                setError(errorMsg);
                props?.onError?.(errorMsg);
                
                // Message d'aide pour le développement
                if (process.env.NODE_ENV === 'development') {
                    console.log(`
💡 ASSURE-TOI QUE LE SERVEUR WEB SOCKET EST DÉMARRÉ :
1. Ouvre un nouveau terminal
2. Lance la commande: npm run dev:ws
3. Recharge cette page
                    `);
                }
            });

            // Gestion de la reconnexion
            newSocket.on('reconnect_attempt', (attemptNumber) => {
                console.log(`🔄 Tentative de reconnexion #${attemptNumber}`);
            });

            newSocket.on('reconnect', () => {
                console.log('✅ Reconnexion réussie');
                // Ré-authentifier après reconnexion
                newSocket.emit('authenticate', {
                    sessionId: newSessionId,
                    userId: userId
                });
            });

            setSocket(newSocket);

        } catch (err: any) {
            console.error('❌ Erreur création session:', err);
            setStatus('error');
            const errorMsg = err.message || 'Erreur lors de la création de la session';
            setError(errorMsg);
            props?.onError?.(errorMsg);
        }
    }, [props, userId]); // Ajouter userId comme dépendance

    // Déconnecter
    const disconnect = useCallback(() => {
        if (socket) {
            console.log('🛑 Déconnexion WebSocket...');
            socket.disconnect();
            setSocket(null);
            setStatus('idle');
            setQrCode(null);
            setPairingCode(null);
            setWhatsappUser(null);

            if (sessionId) {
                whatsappService.disconnectSession(sessionId).catch(console.error);
            }
        }
    }, [socket, sessionId]);

    // Nettoyage automatique
    useEffect(() => {
        return () => {
            if (socket) {
                console.log('🧹 Nettoyage automatique WebSocket');
                socket.disconnect();
            }
        };
    }, [socket]);

    return {
        socket,
        sessionId,
        status,
        qrCode,
        pairingCode,
        error,
        user: whatsappUser, // Renvoyer whatsappUser comme "user"
        createSession,
        disconnect,
        isConnected: status === 'connected'
    };
}
