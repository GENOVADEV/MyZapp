// src/hooks/useWhatsAppConnection.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';

interface UseWhatsAppConnectionProps {
    onQrReceived?: (qr: string) => void;
    onConnected?: (user: any) => void;
    onError?: (error: string) => void;
    onDisconnected?: (reason: string) => void;
    onPairingCodeReceived?: (code: string, phone: string) => void;
}

type Status = 'idle' | 'connecting' | 'qr_pending' | 'connected' | 'error';

// const STORAGE_KEY = 'wa-session-id';

// Petit utilitaire pour générer un ID de session côté client
const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

export function useWhatsAppConnection(props?: UseWhatsAppConnectionProps) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [status, setStatus] = useState<Status>('idle');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [whatsappUser, setWhatsappUser] = useState<any>(null);

    const socketRef = useRef<Socket | null>(null);

    const { user: authUser } = useAuth();
    const userId = authUser?.id;

    // ====================================================================
    // ATTACH EVENTS (Centralisé)
    // ====================================================================
    const attachSocketEvents = useCallback((sock: Socket, currentSessionId: string, initData?: { method: 'qr' | 'phone', phone?: string }) => {

        sock.on('connect', () => {
            console.log('✅ WebSocket connecté au serveur unifié');

            // 1. Demande d'authentification dès la connexion
            sock.emit('authenticate', {
                sessionId: currentSessionId,
                realUserid: userId
            });

            // 2. Demande l'état réel au cas où la session tourne déjà
            sock.emit('get_session_status', { sessionId: currentSessionId });
        });

        sock.on('session_status', (data) => {
            console.log('📊 Status serveur:', data);
            switch (data.status) {
                case 'connected':
                    setStatus('connected');
                    break;
                case 'qr_pending':
                case 'reconnecting':
                case 'initializing':
                    setStatus('connecting');
                    break;
                default:
                    setStatus('idle');
            }
        });

        sock.on('authenticated', (data) => {
            console.log('🔐 Auth OK pour la session:', data.sessionId);

            // Si on a passé initData (ex: on vient de cliquer sur "Se connecter"), on lance l'init
            if (initData && !data.alreadyConnected) {
                sock.emit('init_whatsapp', {
                    sessionId: currentSessionId,
                    method: initData.method,
                    phone: initData.phone?.replace(/[^0-9]/g, ''),
                    userId: userId
                });
            }
        });

        sock.on('whatsapp_event', (event) => {
            console.log('📡 Event WhatsApp:', event.type);

            switch (event.type) {
                case 'qr':
                    setQrCode(event.data.qr);
                    setStatus('connecting');
                    props?.onQrReceived?.(event.data.qr);
                    break;

                case 'pairing_code':
                    setPairingCode(event.data.code);
                    setStatus('connecting');
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
                case 'logged_out':
                    setStatus('idle');
                    setWhatsappUser(null);
                    props?.onDisconnected?.(event.data.reason || 'Déconnecté');
                    // On peut nettoyer le localStorage si c'est un logout volontaire
                    if (event.type === 'logged_out') {
                        localStorage.removeItem(`wa-session-id-${userId}`);
                        setSessionId(null);
                    }
                    break;
            }
        });

        sock.on('disconnect', (reason) => {
            console.log('🔌 Socket disconnect:', reason);
            // On ne change pas le status WhatsApp ici, car c'est juste le réseau web qui coupe
        });

        sock.on('connect_error', (err) => {
            console.error('❌ Socket error:', err.message);
            setStatus('error');
            setError("Impossible de joindre le serveur temps réel.");
        });

        sock.on('reconnect', () => {
            console.log('🔁 Reconnecté au serveur web');
            sock.emit('authenticate', { sessionId: currentSessionId, realUserid: userId });
        });

    }, [props, userId]);

    // ====================================================================
    // HELPER DE CONNEXION GLOBALE
    // ====================================================================
    const connectSocket = useCallback((targetSessionId: string, initData?: { method: 'qr' | 'phone', phone?: string }) => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }

        // On ne passe pas d'URL : Socket.io se connecte automatiquement au domaine actuel (ex: localhost:3000)
        const sock = io(undefined, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000
        });

        attachSocketEvents(sock, targetSessionId, initData);

        socketRef.current = sock;
        setSocket(sock);
    }, [attachSocketEvents]);

    // ====================================================================
    // CREATE SESSION (Bouton "Se connecter")
    // ====================================================================
    const createSession = useCallback((method: 'qr' | 'phone', phone?: string) => {
        if (!userId) {
            setError("Utilisateur non authentifié.");
            return;
        }

        setStatus('connecting');
        setError(null);
        setQrCode(null);
        setPairingCode(null);

        // On génère un nouvel ID ou on réutilise l'existant
        const userStorageKey = `wa-session-id-${userId}`;
        const newSessionId = localStorage.getItem(userStorageKey) || generateId();
        setSessionId(newSessionId);
        localStorage.setItem(userStorageKey, newSessionId);

        // On connecte le socket et on lui passe les infos d'initialisation
        connectSocket(newSessionId, { method, phone });

    }, [userId, connectSocket]);

    // ====================================================================
    // RESTORE SESSION (Au chargement de la page)
    // ====================================================================
    const restoreSession = useCallback(() => {
        if (!userId) return;
        const userStorageKey = `wa-session-id-${userId}`;
        const savedSessionId = localStorage.getItem(userStorageKey);
        if (!savedSessionId || !userId) return;

        console.log('♻️ Tentative de restauration session:', savedSessionId);
        setSessionId(savedSessionId);

        // On se connecte sans paramètres d'initialisation pour juste récupérer l'état
        connectSocket(savedSessionId);

    }, [userId, connectSocket]);

    // ====================================================================
    // DISCONNECT (Bouton "Déconnecter")
    // ====================================================================
    const disconnect = useCallback(async () => {
        if (sessionId && socketRef.current) {
            // On ordonne au serveur de déconnecter WhatsApp officiellement
            socketRef.current.emit('logout_whatsapp', { sessionId });
        }

        // On informe le backend Next.js de nettoyer la base de données (si tu gardes l'API)
        try {
            await fetch('/api/whatsapp/disconnect', { method: 'POST' });
        } catch (e) {
            console.error("Erreur appel API deconnexion:", e);
        }

        if (socketRef.current) {
            socketRef.current.disconnect();
        }

        if (userId) {
            localStorage.removeItem(`wa-session-id-${userId}`);
        }

        localStorage.removeItem('wa-session-id');
        setSocket(null);
        setSessionId(null);
        setStatus('idle');
        setQrCode(null);
        setPairingCode(null);
        setWhatsappUser(null);
        socketRef.current = null;

    }, [sessionId]);

    // ====================================================================
    // AUTO RESTORE
    // ====================================================================
    useEffect(() => {
        if (userId) {
            restoreSession();
        }
    }, [userId, restoreSession]);

    // ====================================================================
    // CLEANUP
    // ====================================================================
    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    return {
        socket,
        sessionId,
        status,
        qrCode,
        pairingCode,
        error,
        user: whatsappUser,
        createSession,
        disconnect,
        isConnected: status === 'connected'
    };
}