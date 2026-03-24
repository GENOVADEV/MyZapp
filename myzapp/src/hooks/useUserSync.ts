// src/hooks/useUserSync.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Types pour les réponses API
interface SyncUserResponse {
  success: boolean;
  synced: boolean;
  errors: string[];
  user?: any;
  stats: {
    phoneUpdated: boolean;
    nameUpdated: boolean;
    avatarUpdated: boolean;
    whatsappConnected: boolean;
  };
}

interface WhatsAppStatusResponse {
  connected: boolean;
  whatsappId?: string;
  lastSync?: string;
  phone?: string;
  phoneVerified: boolean;
  activeDevice?: any;
  status: 'connected' | 'disconnected' | 'syncing';
}

interface DisconnectResponse {
  success: boolean;
  message: string;
  user?: any;
}

// Hook principal pour la synchronisation utilisateur
export function useUserSync() {
  const queryClient = useQueryClient();

  // Mutation pour synchroniser les données utilisateur
  const syncUserMutation = useMutation({
    mutationFn: async (whatsappUser: any): Promise<SyncUserResponse> => {
      const response = await fetch('/api/bot/user/sync', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user: whatsappUser })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la synchronisation');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        // Invalider les queries liées à l'utilisateur
        queryClient.invalidateQueries({ queryKey: ['user'] });
        queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
        
        console.log('✅ Synchronisation utilisateur réussie');
      }
    },
    onError: (error) => {
      console.error('❌ Erreur synchronisation utilisateur:', error);
    }
  });

  // Query pour le statut WhatsApp
  const whatsappStatusQuery = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: async (): Promise<WhatsAppStatusResponse> => {
      const response = await fetch('/api/bot/user/whatsapp-status');
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération du statut WhatsApp');
      }
      
      return await response.json();
    },
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60, // 1 minute
  });

  // Mutation pour déconnecter WhatsApp
  const disconnectMutation = useMutation({
    mutationFn: async (): Promise<DisconnectResponse> => {
      const response = await fetch('/api/bot/user/disconnect-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la déconnexion');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Invalider toutes les données liées à WhatsApp
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      
      console.log('✅ WhatsApp déconnecté avec succès');
    },
    onError: (error) => {
      console.error('❌ Erreur déconnexion WhatsApp:', error);
    }
  });

  // Fonction pour forcer une resynchronisation
  const forceResync = async (): Promise<SyncUserResponse> => {
    const response = await fetch('/api/bot/user/resync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors de la resynchronisation');
    }
    
    return await response.json();
  };

  // Fonction pour vérifier la santé de la connexion
  const checkConnectionHealth = async (): Promise<any> => {
    const response = await fetch('/api/bot/user/health');
    
    if (!response.ok) {
      throw new Error('Erreur lors de la vérification de santé');
    }
    
    return await response.json();
  };

  return {
    // Synchronisation
    syncUserData: syncUserMutation.mutateAsync,
    syncUserLoading: syncUserMutation.isPending,
    syncUserError: syncUserMutation.error,
    
    // Statut
    whatsappStatus: whatsappStatusQuery.data,
    whatsappStatusLoading: whatsappStatusQuery.isLoading,
    whatsappStatusError: whatsappStatusQuery.error,
    refetchWhatsappStatus: whatsappStatusQuery.refetch,
    
    // Déconnexion
    disconnectWhatsApp: disconnectMutation.mutateAsync,
    disconnectLoading: disconnectMutation.isPending,
    disconnectError: disconnectMutation.error,
    
    // Actions avancées
    forceResync,
    checkConnectionHealth,
    
    // États dérivés
    isConnected: whatsappStatusQuery.data?.connected || false,
    lastSync: whatsappStatusQuery.data?.lastSync,
    hasActiveDevice: !!whatsappStatusQuery.data?.activeDevice,
  };
}

// Hook simplifié pour un usage rapide
export function useWhatsAppStatus() {
  const { 
    whatsappStatus, 
    whatsappStatusLoading, 
    refetchWhatsappStatus,
    isConnected 
  } = useUserSync();

  return {
    status: whatsappStatus,
    isLoading: whatsappStatusLoading,
    isConnected,
    refetch: refetchWhatsappStatus
  };
}

// Hook pour la gestion de la déconnexion
export function useWhatsAppDisconnect() {
  const { 
    disconnectWhatsApp, 
    disconnectLoading, 
    disconnectError 
  } = useUserSync();

  return {
    disconnectWhatsApp,
    disconnectLoading,
    disconnectError
  };
}

// Hook pour le statut de synchronisation en temps réel
export function useSyncStatus() {
  const queryClient = useQueryClient();
  
  const getSyncProgress = () => {
    return queryClient.getQueryData(['sync-progress']) as any;
  };
  
  const setSyncProgress = (progress: any) => {
    queryClient.setQueryData(['sync-progress'], progress);
  };
  
  return {
    getSyncProgress,
    setSyncProgress
  };
}
