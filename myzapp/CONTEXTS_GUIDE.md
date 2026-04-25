# Documentation des Contextes - MyZapp Dashboard

## 📋 Vue d'ensemble

L'application utilise plusieurs contextes React pour gérer l'état global :

- **AuthContext** → Authentification utilisateur
- **BotContext** → État de connexion WhatsApp
- **ContactsContext** → Gestion des contacts
- **ConversationsContext** → Gestion des conversations

Tous les contextes sont enveloppés dans le composant `Providers` ([src/components/providers/SessionProvider.tsx](src/components/providers/SessionProvider.tsx)).

---

## 🤖 BotContext - Gestion du Bot WhatsApp

Le BotContext gère la connexion et l'état de votre bot WhatsApp.

### État disponible

```typescript
const {
  status,           // "connected" | "connecting" | "error" | "disconnected"
  isConnected,      // booléen pour vérifier la connexion
  isSyncing,        // booléen si la synchro est en cours
  syncProgress,     // SyncProgress[] - détails de la synchro
  error,            // Message d'erreur ou null
  sessionId,        // ID de la session WhatsApp
} = useBot();
```

### Méthodes

```typescript
const {
  connectBot,       // (sessionId?: string) => Promise<void>
  disconnectBot,    // () => Promise<void>
  refreshStatus,    // () => Promise<void>
  clearError,       // () => void
} = useBot();
```

### Exemple d'utilisation

```typescript
import { useBot } from "@/contexts/BotContext";

function MyComponent() {
  const { status, isConnected, connectBot, disconnectBot } = useBot();

  return (
    <div>
      <p>Statut: {status}</p>
      
      {!isConnected && (
        <button onClick={() => connectBot("my-session")}>
          Connecter WhatsApp
        </button>
      )}
      
      {isConnected && (
        <button onClick={disconnectBot}>
          Déconnecter WhatsApp
        </button>
      )}
    </div>
  );
}
```

### Structure SyncProgress

```typescript
interface SyncProgress {
  type: "user" | "contacts" | "conversations";
  status: "pending" | "in_progress" | "completed" | "error";
  progress?: number; // 0-100
  message?: string;
}
```

---

## 👥 ContactsContext - Gestion des Contacts

Le ContactsContext gère la liste des contacts et les opérations associées.

### État disponible

```typescript
const {
  contacts,          // Contact[]
  totalContacts,     // number
  isLoading,         // booléen
  error,             // Message d'erreur ou null
} = useContacts();
```

### Méthodes

```typescript
const {
  refreshContacts,   // () => Promise<void>
  addContact,        // (contact: Contact) => Promise<void>
  deleteContact,     // (contactId: string) => Promise<void>
  searchContacts,    // (query: string) => Promise<Contact[]>
  clearError,        // () => void
} = useContacts();
```

### Exemple d'utilisation

```typescript
import { useContacts } from "@/contexts/ContactsContext";

function ContactsList() {
  const { contacts, totalContacts, refreshContacts } = useContacts();

  useEffect(() => {
    refreshContacts();
  }, [refreshContacts]);

  return (
    <div>
      <h2>Contacts ({totalContacts})</h2>
      <ul>
        {contacts.map(contact => (
          <li key={contact.id}>{contact.name || contact.phone}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Structure Contact

```typescript
interface Contact {
  id: string;
  name?: string;
  phone: string;
  avatar?: string;
  email?: string;
  createdAt?: Date;
}
```

---

## 💬 ConversationsContext - Gestion des Conversations

Le ConversationsContext gère la liste des conversations avec WhatsApp.

### État disponible

```typescript
const {
  conversations,        // Conversation[]
  totalConversations,   // number
  isLoading,            // booléen
  error,                // Message d'erreur ou null
} = useConversations();
```

### Méthodes

```typescript
const {
  refreshConversations,   // () => Promise<void>
  getConversation,        // (id: string) => Promise<Conversation | null>
  deleteConversation,     // (id: string) => Promise<void>
  archiveConversation,    // (id: string) => Promise<void>
  clearError,             // () => void
} = useConversations();
```

### Exemple d'utilisation

```typescript
import { useConversations } from "@/contexts/ConversationsContext";

function ConversationsList() {
  const { conversations, refreshConversations } = useConversations();

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  return (
    <div>
      {conversations.map(conv => (
        <div key={conv.id}>
          <h3>{conv.name}</h3>
          <p>{conv.type === "GROUP" ? "Groupe" : "Contact"}</p>
          <span>{conv.unreadCount} non lus</span>
        </div>
      ))}
    </div>
  );
}
```

### Structure Conversation

```typescript
interface Conversation {
  id: string;
  name?: string;
  type: "INDIVIDUAL" | "GROUP";
  contact?: { id: string; name?: string; phone: string };
  group?: { id: string; name: string };
  messages?: Message[];
  lastMessageAt?: Date;
  unreadCount: number;
  avatar?: string;
}
```

---

## 🔗 Hiérarchie des Providers

```
SessionProvider (NextAuth)
  └─ AuthProvider
      └─ BotProvider
          └─ ContactsProvider
              └─ ConversationsProvider
                  └─ App Content
```

Cela signifie que :
- **AuthProvider** dépend de **SessionProvider**
- **BotProvider** dépend de **AuthProvider**
- **ContactsProvider** et **ConversationsProvider** dépendent de **BotProvider**

---

## ⚙️ Configuration - Routes API Requises

Pour que les contextes fonctionnent correctement, vous devez créer ces routes API :

### Routes Bot
- `POST /api/bot` - Démarrer/arrêter le bot
- `GET /api/bot?sessionId=xxx` - Vérifier le statut

### Routes Contacts
- `GET /api/contacts` - Lister les contacts
- `POST /api/contacts` - Ajouter un contact
- `DELETE /api/contacts/:id` - Supprimer un contact
- `GET /api/contacts/search?q=xxx` - Rechercher

### Routes Conversations
- `GET /api/conversations` - Lister les conversations
- `GET /api/conversations/:id` - Obtenir une conversation
- `DELETE /api/conversations/:id` - Supprimer
- `POST /api/conversations/:id/archive` - Archiver

---

## 📚 Composants utilisant les Contextes

### [src/components/layout/sidebar.tsx](src/components/layout/sidebar.tsx)
- Utilise: `useAuth()`, `useBot()`
- Affiche le statut du bot WhatsApp

### [src/components/dashboard/home.tsx](src/components/dashboard/home.tsx)
- Utilise: `useAuth()`, `useBot()`, `useContacts()`, `useConversations()`
- Affiche le tableau de bord principal avec stats et conversations

---

## 🎯 Bonnes pratiques

### 1. Toujours vérifier le chargement
```typescript
const { isLoading, error, contacts } = useContacts();

if (isLoading) return <Spinner />;
if (error) return <Error message={error} />;

return <ContactsList contacts={contacts} />;
```

### 2. Rafraîchir au montage
```typescript
useEffect(() => {
  refreshContacts();
}, [refreshContacts]);
```

### 3. Gérer les erreurs
```typescript
const { error, clearError } = useContacts();

useEffect(() => {
  if (error) {
    // Afficher le message d'erreur
    // Puis nettoyer
    clearError();
  }
}, [error, clearError]);
```

### 4. Vérifier l'authentification
```typescript
// Les contextes nécessitent une session active
// Assurez-vous que l'utilisateur est authentifié
const { data: session } = useSession();

if (!session) return <div>Non authentifié</div>;

const { contacts } = useContacts();
```

---

## 🐛 Dépannage

### "useBot doit être utilisé dans un BotProvider"
→ Vérifiez que votre composant est enveloppé par `Providers`

### Les données ne se rafraîchissent pas
→ Appelez `refreshContacts()` ou `refreshConversations()` après une mutation

### Les erreurs persistent
→ Utilisez `clearError()` après avoir géré l'erreur

---

## 📝 À implémenter

Pour une intégration complète, créez les routes API pour :
- Contacts (CRUD)
- Conversations (CRUD)
- Messages (envoi, synchro)
- Groupes

Exemple basique pour `GET /api/contacts` :

```typescript
// src/app/api/contacts/route.ts
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

  // Récupérer les contacts depuis Prisma
  const contacts = await prisma.contact.findMany({
    where: { userId: session.user.id }
  });

  return NextResponse.json({
    contacts,
    total: contacts.length
  });
}
```

