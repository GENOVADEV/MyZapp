// src/types/index.ts

// ============================================================================
// ÉNUMÉRATIONS
// ============================================================================

export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
  DELETED = "DELETED",
}

export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
  MODERATOR = "MODERATOR",
}

export enum Plan {
  FREE = "FREE",
  YOUNG = "YOUNG",
  AGENT = "AGENT",
  BUSINESS = "BUSINESS",
  PRO = "PRO",
}

export enum TokenType {
  EMAIL_VERIFICATION = "EMAIL_VERIFICATION",
  PASSWORD_RESET = "PASSWORD_RESET",
  TWO_FACTOR = "TWO_FACTOR",
  PHONE_VERIFICATION = "PHONE_VERIFICATION",
}

export enum DeviceType {
  WEB = "WEB",
  MOBILE = "MOBILE",
  DESKTOP = "DESKTOP",
  TABLET = "TABLET",
}

export enum ConversationType {
  DIRECT = "DIRECT",
  GROUP = "GROUP",
  SELF = "SELF",
}

export enum MessageType {
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  AUDIO = "AUDIO",
  VOICE_NOTE = "VOICE_NOTE",
  DOCUMENT = "DOCUMENT",
  LOCATION = "LOCATION",
  CONTACT = "CONTACT",
  STICKER = "STICKER",
  POLL = "POLL",
  SYSTEM = "SYSTEM",
}

export enum MessageStatus {
  ERROR = "ERROR",
  PENDING = "PENDING",
  SERVER_ACK = "SERVER_ACK",
  READ = "READ",
  PLAYED = "PLAYED",
  SENT = "SENT",
}

export enum MediaType {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  AUDIO = "AUDIO",
  DOCUMENT = "DOCUMENT",
  VOICE_NOTE = "VOICE_NOTE",
}

export enum RecipientType {
  CONTACT = "CONTACT",
  GROUP = "GROUP",
}

export enum ScheduledMessageStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export enum RepeatType {
  ONCE = "ONCE",
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
}

export enum GroupRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MODERATOR = "MODERATOR",
  MEMBER = "MEMBER",
}

export enum CallType {
  AUDIO = "AUDIO",
  VIDEO = "VIDEO",
}

export enum CallStatus {
  RINGING = "RINGING",
  ONGOING = "ONGOING",
  ENDED = "ENDED",
  MISSED = "MISSED",
  DECLINED = "DECLINED",
}

export enum CallQuality {
  EXCELLENT = "EXCELLENT",
  GOOD = "GOOD",
  FAIR = "FAIR",
  POOR = "POOR",
}

export enum BotType {
  AUTO_REPLY = "AUTO_REPLY",
  WELCOME_MESSAGE = "WELCOME_MESSAGE",
  SCHEDULED = "SCHEDULED",
  CUSTOM = "CUSTOM",
}

export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  PAST_DUE = "PAST_DUE",
  CANCELED = "CANCELED",
  INCOMPLETE = "INCOMPLETE",
  TRIALING = "TRIALING",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

export enum PaymentProvider {
  STRIPE = "STRIPE",
  PAYPAL = "PAYPAL",
  CREDIT_CARD = "CREDIT_CARD",
}

export enum NotificationType {
  NEW_MESSAGE = "NEW_MESSAGE",
  MENTION = "MENTION",
  CALL_MISSED = "CALL_MISSED",
  GROUP_INVITE = "GROUP_INVITE",
  SYSTEM = "SYSTEM",
  PAYMENT = "PAYMENT",
  SECURITY = "SECURITY",
}

export enum NotificationStatus {
  UNREAD = "UNREAD",
  READ = "READ",
}

// ============================================================================
// TYPES PRINCIPAUX
// ============================================================================

export interface User {
  id: string;
  email: string;
  emailVerified?: Date;
  name?: string;
  username?: string;
  phone?: string;
  phoneVerified?: Date;
  image?: string;
  password?: string;
  language: string;
  theme: string;
  timezone: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  status: UserStatus;
  role: UserRole;
  plan: Plan;
  planExpiresAt?: Date;
  trialEndsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  whatsappConnected : boolean;
  whatsappId : string;
  lastWhatsappSync: Date;
}

export interface Account {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token?: string;
  access_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
  session_state?: string;
}

export interface Session {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
  userAgent?: string;
  ipAddress?: string;
  deviceId?: string;
}

export interface VerificationToken {
  identifier: string;
  token: string;
  type: TokenType;
  expires: Date;
  createdAt: Date;
}

export interface Device {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: DeviceType;
  deviceToken?: string;
  platform?: string;
  osVersion?: string;
  appVersion?: string;
  isActive: boolean;
  lastSeenAt: Date;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  userId: string;
  type: ConversationType;
  name?: string;
  description?: string;
  avatar?: string;
  contactId?: string;
  groupId?: string;
  isPinned: boolean;
  isMuted: boolean;
  mutedUntil?: Date;
  isArchived: boolean;
  isBlocked: boolean;
  isLocked: boolean;
  lockPin?: string;
  ephemeralEnabled: boolean;
  ephemeralDuration?: number;
  folderId?: string;
  lastMessageAt?: Date;
  lastReadAt?: Date;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content?: string;
  mediaFileId?: string;
  voiceNoteId?: string;
  replyToId?: string;
  forwardedFromId?: string;
  forwardCount: number;
  status: MessageStatus;
  deliveredAt?: Date;
  readAt?: Date;
  isEdited: boolean;
  editedAt?: Date;
  originalContent?: string;
  editHistory?: any[];
  isDeleted: boolean;
  deletedAt?: Date;
  deletedFor: string[];
  isPinned: boolean;
  expiresAt?: Date;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduledMessage {
  id: string;
  userId: string;
  conversationId?: string;
  recipientType: RecipientType;
  recipientId: string;
  type: MessageType;
  content?: string;
  mediaFileId?: string;
  scheduledFor: Date;
  timezone: string;
  status: ScheduledMessageStatus;
  sentAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  repeatType: RepeatType;
  repeatUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Draft {
  id: string;
  conversationId: string;
  userId: string;
  content?: string;
  mediaFiles: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string;
  userId: string;
  contactUserId?: string;
  name: string;
  phone?: string;
  email?: string;
  avatar?: string;
  bio?: string;
  isFavorite: boolean;
  isBlocked: boolean;
  notes?: string;
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  ownerId: string;
  maxMembers: number;
  isPublic: boolean;
  inviteLink?: string;
  onlyAdminsCanPost: boolean;
  onlyAdminsCanEdit: boolean;
  membersCanAddOthers: boolean;
  ephemeralEnabled: boolean;
  ephemeralDuration?: number;
  moderationEnabled: boolean;
  bannedWords: string[];
  autoDeleteSpam: boolean;
  totalMessages: number;
  activeMembers: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: GroupRole;
  canPost: boolean;
  canInvite: boolean;
  isMuted: boolean;
  mutedUntil?: Date;
  joinedAt: Date;
  leftAt?: Date;
}

export interface MediaFile {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  type: MediaType;
  isCompressed: boolean;
  originalUrl?: string;
  storageProvider: string;
  storagePath: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface VoiceNote {
  id: string;
  userId: string;
  url: string;
  duration: number;
  waveform?: any;
  transcription?: string;
  transcribedAt?: Date;
  language?: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
}

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
}

export interface Poll {
  id: string;
  groupId?: string;
  createdBy: string;
  question: string;
  options: any[];
  allowMultiple: boolean;
  isAnonymous: boolean;
  expiresAt?: Date;
  isClosed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PollVote {
  id: string;
  pollId: string;
  userId: string;
  optionIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Call {
  id: string;
  initiatorId: string;
  type: CallType;
  status: CallStatus;
  participantIds: string[];
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
  isRecorded: boolean;
  recordingUrl?: string;
  quality?: CallQuality;
  createdAt: Date;
}

export interface Folder {
  id: string;
  userId: string;
  name: string;
  icon?: string;
  color?: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Bot {
  id: string;
  userId: string;
  name: string;
  description?: string;
  avatar?: string;
  type: BotType;
  config: any;
  triggers: any;
  isActive: boolean;
  totalMessages: number;
  lastTriggeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: Plan;
  status: SubscriptionStatus;
  provider: PaymentProvider;
  providerSubId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  userId: string;
  subscriptionId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  providerPaymentId?: string;
  metadata?: any;
  createdAt: Date;
}

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  scopes: string[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: any;
  actionUrl?: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  changes?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// ============================================================================
// TYPES UTILITAIRES
// ============================================================================

export interface UserWithRelations extends User {
  accounts: Account[];
  sessions: Session[];
  conversations: Conversation[];
  messages: Message[];
  contacts: Contact[];
  contactOf: Contact[];
  groups: GroupMember[];
  ownedGroups: Group[];
  bots: Bot[];
  scheduledMessages: ScheduledMessage[];
  folders: Folder[];
  devices: Device[];
  notifications: Notification[];
  payments: Payment[];
  apiKeys: ApiKey[];
  auditLogs: AuditLog[];
  mediaFiles: MediaFile[];
  voiceNotes: VoiceNote[];
  reactions: Reaction[];
  polls: Poll[];
  pollVotes: PollVote[];
  calls: Call[];
  initiatedCalls: Call[];
  subscriptions: Subscription[];
}

export interface ConversationWithRelations extends Conversation {
  user: User;
  contact?: Contact;
  group?: Group;
  folder?: Folder;
  messages: Message[];
  drafts: Draft[];
}

export interface MessageWithRelations extends Message {
  conversation: Conversation;
  sender: User;
  mediaFile?: MediaFile;
  voiceNote?: VoiceNote;
  replyTo?: Message;
  replies: Message[];
  forwardedFrom?: Message;
  forwards: Message[];
  reactions: Reaction[];
}

export interface GroupWithRelations extends Group {
  owner: User;
  members: GroupMember[];
  conversations: Conversation[];
  polls: Poll[];
}

export interface ContactWithRelations extends Contact {
  user: User;
  contactUser?: User;
  conversations: Conversation[];
}

// ============================================================================
// TYPES POUR LES API
// ============================================================================

export interface CreateMessageInput {
  conversationId: string;
  content?: string;
  type?: MessageType;
  replyToId?: string;
  mediaFileId?: string;
}

export interface UpdateMessageInput {
  id: string;
  content: string;
  isEdited?: boolean;
}

export interface CreateConversationInput {
  userId: string;
  contactId?: string;
  groupId?: string;
  type: ConversationType;
  name?: string;
  description?: string;
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  avatar?: string;
  members: string[];
  isPublic?: boolean;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name?: string;
  phone?: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  phone?: string;
  language?: string;
  theme?: string;
  timezone?: string;
}

export interface CreateContactInput {
  name: string;
  phone?: string;
  email?: string;
  avatar?: string;
  userId: string;
}

export interface CreateFolderInput {
  name: string;
  icon?: string;
  color?: string;
  userId: string;
}

export interface CreateSubscriptionInput {
  userId: string;
  plan: Plan;
  provider: PaymentProvider;
  providerSubId: string;
  trialEnd?: Date;
}

export interface CreateBotInput {
  name: string;
  description?: string;
  type: BotType;
  config: any;
  triggers: any;
  userId: string;
}
