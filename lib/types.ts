export type Relationship =
  | 'Mother'
  | 'Father'
  | 'Sister'
  | 'Brother'
  | 'Grandmother'
  | 'Grandfather'
  | 'Aunt'
  | 'Uncle'
  | 'Cousin'
  | 'Daughter'
  | 'Son'
  | 'Partner'
  | 'Guardian'
  | 'Other';

export const RELATIONSHIPS: Relationship[] = [
  'Mother',
  'Father',
  'Sister',
  'Brother',
  'Grandmother',
  'Grandfather',
  'Aunt',
  'Uncle',
  'Cousin',
  'Daughter',
  'Son',
  'Partner',
  'Guardian',
  'Other',
];

export const RELATIONSHIP_ICONS: Record<Relationship, string> = {
  Mother: 'heart',
  Father: 'heart',
  Sister: 'happy',
  Brother: 'happy',
  Grandmother: 'flower',
  Grandfather: 'flower',
  Aunt: 'leaf',
  Uncle: 'leaf',
  Cousin: 'sparkles',
  Daughter: 'star',
  Son: 'star',
  Partner: 'gift',
  Guardian: 'shield-checkmark',
  Other: 'person',
};

export type ThemePreference = 'system' | 'light' | 'dark';

export interface UserSettings {
  theme: ThemePreference;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  previewTextEnabled: boolean;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  relationship: Relationship;
  bio: string;
  avatarColor: string;
  avatarEmoji: string | null;
  online: boolean;
  lastSeenAt: number;
  blockedUserIds: string[];
  familyIds: string[];
  settings: UserSettings;
  isBot: boolean;
  botPersonaId?: string;
  createdAt: number;
}

export interface FamilyRecord {
  id: string;
  name: string;
  emoji: string;
  color: string;
  inviteCode: string;
  createdAt: number;
  createdBy: string;
  adminUserIds: string[];
  memberIds: string[];
}

export type ConversationType = 'dm' | 'group';

export interface ConversationRecord {
  id: string;
  type: ConversationType;
  familyId: string;
  name: string | null;
  emoji: string | null;
  color: string;
  memberIds: string[];
  adminIds: string[];
  mutedBy: string[];
  createdAt: number;
  lastMessageAt: number;
  isFamilyRoom: boolean;
}

export type MessageKind = 'text' | 'image' | 'voice' | 'system';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface ReplyRef {
  messageId: string;
  senderId: string;
  senderName: string;
  preview: string;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  kind: MessageKind;
  text?: string;
  imageUri?: string;
  voiceUri?: string | null;
  voiceDurationMs?: number;
  voicePeaks?: number[];
  replyTo?: ReplyRef | null;
  createdAt: number;
  status: MessageStatus;
  systemKind?: 'created' | 'joined' | 'left' | 'removed' | 'code';
}

export type NotificationKind = 'message' | 'family' | 'member' | 'system';

export interface AppNotificationRecord {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  emoji: string;
  conversationId?: string;
  familyId?: string;
  createdAt: number;
  read: boolean;
}

export interface SessionRecord {
  userId: string;
  token: string;
  createdAt: number;
}

export interface ReportRecord {
  id: string;
  reporterId: string;
  reportedId: string;
  reason: string;
  detail: string;
  createdAt: number;
}

export interface Database {
  users: Record<string, UserRecord>;
  families: Record<string, FamilyRecord>;
  conversations: Record<string, ConversationRecord>;
  messages: Record<string, MessageRecord[]>;
  notifications: AppNotificationRecord[];
  reports: ReportRecord[];
  session: SessionRecord | null;
  seededAt: number;
}

export interface BotPersona {
  id: string;
  name: string;
  relationship: Relationship;
  avatarColor: string;
  avatarEmoji: string | null;
  bio: string;
  replies: string[];
  questionReplies: string[];
  photoReplies: string[];
  voiceReplies: string[];
  thinkMs: [number, number];
  replyChance: number;
  opener?: string;
}

export type NewMessageInput =
  | { kind: 'text'; text: string; replyTo?: ReplyRef | null }
  | { kind: 'image'; imageUri: string; text?: string; replyTo?: ReplyRef | null }
  | { kind: 'voice'; voiceUri: string | null; voiceDurationMs: number; voicePeaks: number[]; replyTo?: ReplyRef | null };
