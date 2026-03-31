// src/hooks/useWhatsAppConnection.ts
import { useState, useEffect, useCallback, useRef } from 'react';
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

type Status = 'idle' | 'connecting' | 'qr_pending' | 'connected' | 'error';

const STORAGE_KEY = 'wa-session-id';

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
    // CONFIG SOCKET
    // ====================================================================
    const getSocketUrl = () => {
        return process.env.NODE_ENV === 'production'
            ? 'wss://ton-domaine.com'
            : 'http://localhost:3001';
    };

    // ====================================================================
    // ATTACH EVENTS (centralisé proprement)
    // ====================================================================
    const attachSocketEvents = useCallback((sock: Socket, currentSessionId: string) => {

        sock.on('connect', () => {
            console.log('✅ WebSocket connecté');

            sock.emit('authenticate', {
                sessionId: currentSessionId,
                realUserid: userId
            });

            // 🔥 demander état réel
            sock.emit('get_session_status', { sessionId: currentSessionId });
        });

        sock.on('session_status', (data) => {
            console.log('📊 Status serveur:', data);

            switch (data.status) {
                case 'connected':
                    setStatus('connected');
                    break;
                case 'qr_pending':
                    setStatus('qr_pending');
                    break;
                case 'reconnecting':
                    setStatus('connecting');
                    break;
                default:
                    setStatus('idle');
            }
        });

        sock.on('authenticated', () => {
            console.log('🔐 Auth OK');
        });

        sock.on('whatsapp_event', (event) => {
            console.log('📡 Event:', event.type);

            switch (event.type) {
                case 'qr':
                    setQrCode(event.data.qr);
                    setStatus('qr_pending');
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
                    setStatus('idle');
                    setWhatsappUser(null);
                    props?.onDisconnected?.(event.data.reason);
                    break;
            }
        });

        sock.on('disconnect', (reason) => {
            console.log('🔌 Socket disconnect:', reason);
            setStatus('idle');
        });

        sock.on('connect_error', (err) => {
            console.error('❌ Socket error:', err.message);
            setStatus('error');
            setError(err.message);
            props?.onError?.(err.message);
        });

        sock.on('reconnect', () => {
            console.log('🔁 Reconnecté');

            sock.emit('authenticate', {
                sessionId: currentSessionId,
                realUserid: userId
            });
        });

    }, [props, userId]);

    // ====================================================================
    // CREATE SESSION
    // ====================================================================
    const createSession = useCallback(async (method: 'qr' | 'phone', phone?: string) => {
        try {
            setStatus('connecting');
            setError(null);
            setQrCode(null);
            setPairingCode(null);
            setWhatsappUser(null);

            const session = await whatsappService.createSession();
            const newSessionId = session.sessionId;

            setSessionId(newSessionId);
            localStorage.setItem(STORAGE_KEY, newSessionId);

            const sock = io(getSocketUrl(), {
                auth: {
                    token: localStorage.getItem('auth-token'),
                    userId
                },
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelay: 1000
            });

            attachSocketEvents(sock, newSessionId);

            sock.on('authenticated', () => {
                sock.emit('init_whatsapp', {
                    sessionId: newSessionId,
                    method,
                    phone: phone?.replace(/[^0-9]/g, ''),
                    userId
                });
            });

            socketRef.current = sock;
            setSocket(sock);

        } catch (err: any) {
            setStatus('error');
            setError(err.message);
        }
    }, [attachSocketEvents, userId]);

    // ====================================================================
    // RESTORE SESSION (🔥 le plus important)
    // ====================================================================
    const restoreSession = useCallback(() => {
        const savedSessionId = localStorage.getItem(STORAGE_KEY);
        if (!savedSessionId || !userId) return;

        console.log('♻️ Restauration session:', savedSessionId);

        const sock = io(getSocketUrl(), {
            auth: {
                token: localStorage.getItem('auth-token'),
                userId
            },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: Infinity,
        });

        attachSocketEvents(sock, savedSessionId);

        socketRef.current = sock;
        setSocket(sock);
        setSessionId(savedSessionId);

    }, [attachSocketEvents, userId]);

    // ====================================================================
    // DISCONNECT
    // ====================================================================
    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }

        if (sessionId) {
            whatsappService.disconnectSession(sessionId).catch(console.error);
        }

        localStorage.removeItem(STORAGE_KEY);

        setSocket(null);
        setSessionId(null);
        setStatus('idle');
        setQrCode(null);
        setPairingCode(null);
        setWhatsappUser(null);

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
            socketRef.current?.disconnect();
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