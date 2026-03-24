// src/hooks/useContacts.ts
import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Types pour les contacts
export interface Contact {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  email?: string;
  avatar?: string;
  bio?: string;
  isFavorite: boolean;
  isBlocked: boolean;
  notes?: string;
  customFields?: any;
  contactUserId?: string;
  createdAt: Date;
  updatedAt: Date;
  contactUser?: {
    id: string;
    name: string;
    image?: string;
    phone?: string;
  };
  conversations?: Array<{
    id: string;
    lastMessageAt?: Date;
    unreadCount: number;
  }>;
}

interface ContactsResponse {
  contacts: Contact[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface ContactFilters {
  favorites?: boolean;
  blocked?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

interface SyncContactsResponse {
  success: boolean;
  synced: number;
  errors: string[];
  stats: {
    total: number;
    new: number;
    updated: number;
    skipped: number;
  };
}

export function useContacts(filters?: ContactFilters) {
  const queryClient = useQueryClient();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Paramètres par défaut
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;

  // Query pour récupérer les contacts
  const {
    data: contactsData,
    isLoading,
    error,
    refetch: refetchContactsQuery
  } = useQuery({
    queryKey: ['contacts', filters, page, limit],
    queryFn: async (): Promise<ContactsResponse> => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      if (filters?.favorites !== undefined) params.append('favorites', filters.favorites.toString());
      if (filters?.blocked !== undefined) params.append('blocked', filters.blocked.toString());
      if (filters?.search) params.append('search', filters.search);

      const response = await fetch(`/api/contacts?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors du chargement des contacts');
      }
      
      return await response.json();
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  // Mutation pour synchroniser les contacts WhatsApp
  const syncContactsMutation = useMutation({
    mutationFn: async (contacts: any[]): Promise<SyncContactsResponse> => {
      const response = await fetch('/api/contacts/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la synchronisation');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalider et rafraîchir les données après synchronisation
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      console.log(`✅ ${data.synced} contacts synchronisés`);
    },
    onError: (error) => {
      console.error('❌ Erreur synchronisation contacts:', error);
    }
  });

  // Mutation pour basculer le statut favori
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (contactId: string): Promise<Contact> => {
      const response = await fetch(`/api/contacts/${contactId}/favorite`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la modification du contact');
      }
      
      return await response.json();
    },
    onSuccess: (updatedContact) => {
      // Mettre à jour le cache local
      queryClient.setQueryData(
        ['contacts', filters, page, limit],
        (old: ContactsResponse) => ({
          ...old,
          contacts: old.contacts.map(contact =>
            contact.id === updatedContact.id ? updatedContact : contact
          )
        })
      );
      
      if (selectedContact?.id === updatedContact.id) {
        setSelectedContact(updatedContact);
      }
    }
  });

  // Mutation pour basculer le blocage
  const toggleBlockMutation = useMutation({
    mutationFn: async (contactId: string): Promise<Contact> => {
      const response = await fetch(`/api/contacts/${contactId}/block`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors du blocage du contact');
      }
      
      return await response.json();
    },
    onSuccess: (updatedContact) => {
      queryClient.setQueryData(
        ['contacts', filters, page, limit],
        (old: ContactsResponse) => ({
          ...old,
          contacts: old.contacts.map(contact =>
            contact.id === updatedContact.id ? updatedContact : contact
          )
        })
      );
    }
  });

  // Fonction refreshContacts améliorée
  const refreshContacts = useCallback(async (forceRefresh: boolean = false): Promise<void> => {
    try {
      console.log('🔄 Rafraîchissement des contacts...');
      
      if (forceRefresh) {
        // Forcer un rafraîchissement complet depuis le serveur
        await queryClient.invalidateQueries({ queryKey: ['contacts'] });
      }
      
      await refetchContactsQuery();
      
      console.log('✅ Contacts rafraîchis avec succès');
    } catch (error) {
      console.error('❌ Erreur lors du rafraîchissement des contacts:', error);
      throw error;
    }
  }, [refetchContactsQuery, queryClient]);

  // Fonction pour forcer une synchronisation avec WhatsApp
  const syncWithWhatsApp = useCallback(async (): Promise<SyncContactsResponse> => {
    try {
      console.log('🔄 Synchronisation manuelle avec WhatsApp...');
      
      // Appeler une API qui déclenche une resynchronisation
      const response = await fetch('/api/contacts/sync-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la synchronisation WhatsApp');
      }
      
      const result = await response.json();
      
      // Rafraîchir les données après synchronisation
      await refreshContacts(true);
      
      console.log('✅ Synchronisation WhatsApp terminée');
      return result;
    } catch (error) {
      console.error('❌ Erreur synchronisation WhatsApp:', error);
      throw error;
    }
  }, [refreshContacts]);

  // Recherche de contacts
  const searchContacts = useCallback(async (query: string, searchPage: number = 1): Promise<ContactsResponse> => {
    try {
      const response = await fetch(
        `/api/contacts/search?q=${encodeURIComponent(query)}&page=${searchPage}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error('Erreur lors de la recherche');
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Erreur recherche contacts:', error);
      throw error;
    }
  }, [limit]);

  // Obtenir les statistiques des contacts
  const getStats = useCallback(async () => {
    try {
      const response = await fetch('/api/contacts/stats');
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des statistiques');
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Erreur récupération statistiques:', error);
      throw error;
    }
  }, []);

  // Sélectionner un contact
  const selectContact = useCallback((contact: Contact | null) => {
    setSelectedContact(contact);
  }, []);

  // Hook pour la recherche (compatible avec l'ancienne interface)
  const searchContactsQuery = (query: string, searchPage: number = 1) => {
    return useQuery({
      queryKey: ['contacts', 'search', query, searchPage],
      queryFn: () => searchContacts(query, searchPage),
      enabled: !!query,
    });
  };

  // Hook pour tous les contacts (compatible avec l'ancienne interface)
  const contactsQuery = (queryFilters?: { favorites?: boolean; blocked?: boolean }) => {
    const combinedFilters = { ...filters, ...queryFilters };
    
    return useQuery({
      queryKey: ['contacts', combinedFilters, page, limit],
      queryFn: async (): Promise<ContactsResponse> => {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        
        if (combinedFilters?.favorites !== undefined) params.append('favorites', combinedFilters.favorites.toString());
        if (combinedFilters?.blocked !== undefined) params.append('blocked', combinedFilters.blocked.toString());
        if (combinedFilters?.search) params.append('search', combinedFilters.search);

        const response = await fetch(`/api/contacts?${params}`);
        
        if (!response.ok) {
          throw new Error('Erreur lors du chargement des contacts');
        }
        
        return await response.json();
      },
    });
  };

  return {
    // Données
    contacts: contactsData?.contacts || [],
    pagination: contactsData?.pagination,
    selectedContact,
    
    // États de chargement
    isLoading,
    isError: !!error,
    error: error as Error,
    
    // Mutations
    syncContacts: syncContactsMutation.mutateAsync,
    syncContactsStatus: syncContactsMutation.status,
    
    toggleFavorite: toggleFavoriteMutation.mutateAsync,
    toggleFavoriteLoading: toggleFavoriteMutation.isPending,
    
    toggleBlock: toggleBlockMutation.mutateAsync,
    toggleBlockLoading: toggleBlockMutation.isPending,
    
    // Actions principales
    refreshContacts,
    syncWithWhatsApp,
    searchContacts,
    getStats,
    selectContact,
    
    // Compatibilité avec l'ancienne interface
    searchContactsQuery,
    contactsQuery,
    
    // Référence à la fonction originale
    refetchContacts: refetchContactsQuery,
    
    // Statistiques pratiques
    totalContacts: contactsData?.pagination?.total || 0,
    favoritesCount: contactsData?.contacts.filter(contact => contact.isFavorite).length || 0,
    blockedCount: contactsData?.contacts.filter(contact => contact.isBlocked).length || 0,
    recentlyAdded: contactsData?.contacts.filter(contact => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return new Date(contact.createdAt) > sevenDaysAgo;
    }).length || 0,
  };
}

// Hook simplifié pour un contact spécifique
export function useContact(contactId: string) {
  const {
    data: contact,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: async (): Promise<Contact> => {
      const response = await fetch(`/api/contacts/${contactId}`);
      
      if (!response.ok) {
        throw new Error('Contact non trouvé');
      }
      
      return await response.json();
    },
    enabled: !!contactId,
  });

  return {
    contact,
    isLoading,
    isError: !!error,
    error: error as Error,
    refetch
  };
}

// Hook pour la synchronisation en temps réel
export function useContactsSync() {
  const queryClient = useQueryClient();
  
  const forceRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['contacts'] });
  }, [queryClient]);

  return {
    forceRefresh
  };
}
