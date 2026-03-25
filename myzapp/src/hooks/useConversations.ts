// src/hooks/useConversations.ts
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types pour les conversations
export interface Conversation {
  id: string;
  userId: string;
  whatsappId: string;
  type: 'DIRECT' | 'GROUP';
  name?: string;
  unreadCount: number;
  lastMessageAt?: Date;
  lastReadAt?: Date;
  isArchived: boolean;
  isMuted: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  contact?: {
    id: string;
    name: string;
    phone?: string;
    avatar?: string;
    contactUser?: {
      id: string;
      name: string;
      image?: string;
    };
  };
  group?: {
    id: string;
    name: string;
    description?: string;
    avatar?: string;
    owner: {
      id: string;
      name: string;
      image?: string;
    };
    members: Array<{
      id: string;
      role: string;
      user: {
        id: string;
        name: string;
        image?: string;
      };
    }>;
  };
  messages?: Array<{
    id: string;
    content?: string;
    type: string;
    createdAt: Date;
    sender: {
      id: string;
      name: string;
    };
  }>;
}

interface ConversationsResponse {
  conversations: Conversation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface ConversationFilters {
  type?: 'DIRECT' | 'GROUP';
  archived?: boolean;
  muted?: boolean;
  pinned?: boolean;
  search?: string;
  folderId?: string;
}

// Hook principal pour la gestion des conversations
export function useConversations(filters?: ConversationFilters, page: number = 1, limit: number = 50) {
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  // Query pour récupérer les conversations
  const {
    data: conversationsData,
    isLoading,
    error,
    refetch: refreshConversations
  } = useQuery({
    queryKey: ['conversations', filters, page, limit],
    queryFn: async (): Promise<ConversationsResponse> => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      if (filters?.type) params.append('type', filters.type);
      if (filters?.archived !== undefined) params.append('archived', filters.archived.toString());
      if (filters?.muted !== undefined) params.append('muted', filters.muted.toString());
      if (filters?.pinned !== undefined) params.append('pinned', filters.pinned.toString());
      if (filters?.search) params.append('search', filters.search);
      if (filters?.folderId) params.append('folderId', filters.folderId);

      const response = await fetch(`/api/bot/conversations?${params}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des conversations');
      }
      
      return await response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  // Mutation pour épingler/désépingler une conversation
  const togglePinMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await fetch(`/api/bot/conversations/${conversationId}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la modification de la conversation');
      }
      
      return await response.json();
    },
    onSuccess: (updatedConversation) => {
      // Mettre à jour le cache local
      queryClient.setQueryData(
        ['conversations', filters, page, limit],
        (old: ConversationsResponse) => ({
          ...old,
          conversations: old.conversations.map(conv =>
            conv.id === updatedConversation.id ? updatedConversation : conv
          )
        })
      );
      
      if (selectedConversation?.id === updatedConversation.id) {
        setSelectedConversation(updatedConversation);
      }
    }
  });

  // Mutation pour archiver/désarchiver une conversation
  const toggleArchiveMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await fetch(`/api/bot/conversations/${conversationId}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'archivage de la conversation');
      }
      
      return await response.json();
    },
    onSuccess: (updatedConversation) => {
      queryClient.setQueryData(
        ['conversations', filters, page, limit],
        (old: ConversationsResponse) => ({
          ...old,
          conversations: old.conversations.map(conv =>
            conv.id === updatedConversation.id ? updatedConversation : conv
          )
        })
      );
    }
  });

  // Mutation pour marquer comme lu
  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await fetch(`/api/bot/conversations/${conversationId}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors du marquage comme lu');
      }
      
      return await response.json();
    },
    onSuccess: (updatedConversation) => {
      queryClient.setQueryData(
        ['conversations', filters, page, limit],
        (old: ConversationsResponse) => ({
          ...old,
          conversations: old.conversations.map(conv =>
            conv.id === updatedConversation.id ? updatedConversation : conv
          )
        })
      );
    }
  });

  // Mutation pour déplacer vers un dossier
  const moveToFolderMutation = useMutation({
    mutationFn: async ({ conversationId, folderId }: { conversationId: string; folderId?: string }) => {
      const response = await fetch(`/api/bot/conversations/${conversationId}/folder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId })
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors du déplacement de la conversation');
      }
      
      return await response.json();
    },
    onSuccess: (updatedConversation) => {
      queryClient.setQueryData(
        ['conversations', filters, page, limit],
        (old: ConversationsResponse) => ({
          ...old,
          conversations: old.conversations.map(conv =>
            conv.id === updatedConversation.id ? updatedConversation : conv
          )
        })
      );
    }
  });

  // Fonction pour sélectionner une conversation
  const selectConversation = useCallback((conversation: Conversation | null) => {
    setSelectedConversation(conversation);
    
    // Marquer automatiquement comme lu lors de la sélection
    if (conversation && conversation.unreadCount > 0) {
      markAsReadMutation.mutate(conversation.id);
    }
  }, [markAsReadMutation]);

  // Fonction pour rechercher des conversations
  const searchConversations = useCallback(async (query: string): Promise<Conversation[]> => {
    const response = await fetch(`/api/bot/conversations/search?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error('Erreur lors de la recherche');
    }
    
    const data = await response.json();
    return data.conversations || [];
  }, []);

  // Fonction pour obtenir les statistiques
  const getStats = useCallback(async () => {
    const response = await fetch('/api/bot/conversations/stats');
    
    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des statistiques');
    }
    
    return await response.json();
  }, []);

  // Rafraîchissement automatique périodique
  useEffect(() => {
    const interval = setInterval(() => {
      // Ne rafraîchir que si l'application est active
      if (!document.hidden) {
        refreshConversations();
      }
    }, 30000); // Toutes les 30 secondes

    return () => clearInterval(interval);
  }, [refreshConversations]);

  return {
    // Données
    conversations: conversationsData?.conversations || [],
    pagination: conversationsData?.pagination,
    selectedConversation,
    
    // États de chargement
    isLoading,
    isError: !!error,
    error: error as Error,
    
    // Mutations
    togglePin: togglePinMutation.mutate,
    togglePinLoading: togglePinMutation.isPending,
    
    toggleArchive: toggleArchiveMutation.mutate,
    toggleArchiveLoading: toggleArchiveMutation.isPending,
    
    markAsRead: markAsReadMutation.mutate,
    markAsReadLoading: markAsReadMutation.isPending,
    
    moveToFolder: moveToFolderMutation.mutate,
    moveToFolderLoading: moveToFolderMutation.isPending,
    
    // Actions
    refreshConversations,
    selectConversation,
    searchConversations,
    getStats,
    
    // Statistiques pratiques
    totalConversations: conversationsData?.pagination?.total || 0,
    unreadCount: conversationsData?.conversations.reduce((sum, conv) => sum + conv.unreadCount, 0) || 0,
    pinnedCount: conversationsData?.conversations.filter(conv => conv.isPinned).length || 0,
    archivedCount: conversationsData?.conversations.filter(conv => conv.isArchived).length || 0,
  };
}

// Hook simplifié pour une conversation spécifique
export function useConversation(conversationId: string) {
  const {
    data: conversation,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async (): Promise<Conversation> => {
      const response = await fetch(`/api/bot/conversations/${conversationId}`);
      
      if (!response.ok) {
        throw new Error('Conversation non trouvée');
      }
      
      return await response.json();
    },
    enabled: !!conversationId,
  });

  return {
    conversation,
    isLoading,
    isError: !!error,
    error: error as Error,
    refetch
  };
}

// Hook pour les messages d'une conversation
export function useConversationMessages(conversationId: string, page: number = 1, limit: number = 50) {
  const {
    data: messagesData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['conversation-messages', conversationId, page, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/bot/users/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des messages');
      }
      
      return await response.json();
    },
    enabled: !!conversationId,
  });

  return {
    messages: messagesData?.messages || [],
    pagination: messagesData?.pagination,
    isLoading,
    isError: !!error,
    error: error as Error,
    refetch
  };
}
