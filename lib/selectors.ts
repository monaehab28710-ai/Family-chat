import { previewOf } from './format';
import type { AppNotificationRecord, ConversationRecord, Database, MessageRecord, UserRecord } from './types';

export interface ConversationItem {
  conv: ConversationRecord;
  other: UserRecord | null;
  title: string;
  color: string;
  emoji: string | null;
  avatarUser: UserRecord | null;
  lastMessage: MessageRecord | null;
  preview: string;
  unread: number;
  muted: boolean;
  isAdmin: boolean;
}

export function conversationMeta(db: Database, conv: ConversationRecord, userId: string) {
  if (conv.type === 'dm') {
    const otherId = conv.memberIds.find((id) => id !== userId) ?? conv.memberIds[0];
    const other = db.users[otherId] ?? null;
    return {
      title: other?.name ?? 'Family member',
      color: other?.avatarColor ?? conv.color,
      emoji: null as string | null,
      avatarUser: other,
      other,
    };
  }
  return {
    title: conv.name ?? 'Family group',
    color: conv.color,
    emoji: conv.emoji,
    avatarUser: null,
    other: null,
  };
}

export function conversationItems(db: Database, userId: string): ConversationItem[] {
  return Object.values(db.conversations)
    .filter((conv) => conv.memberIds.includes(userId))
    .map((conv) => {
      const meta = conversationMeta(db, conv, userId);
      const messages = db.messages[conv.id] ?? [];
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      const unread = messages.filter((m) => m.senderId !== userId && m.status !== 'read').length;
      return {
        conv,
        other: meta.other,
        title: meta.title,
        color: meta.color,
        emoji: meta.emoji,
        avatarUser: meta.avatarUser,
        lastMessage,
        preview: lastMessage ? previewOf(lastMessage) : 'No messages yet',
        unread,
        muted: conv.mutedBy.includes(userId),
        isAdmin: conv.adminIds.includes(userId),
      };
    })
    .sort((a, b) => b.conv.lastMessageAt - a.conv.lastMessageAt);
}

export function familyMembers(db: Database, familyId: string): UserRecord[] {
  const family = db.families[familyId];
  if (!family) return [];
  return family.memberIds.map((id) => db.users[id]).filter((u): u is UserRecord => Boolean(u));
}

export function myFamily(db: Database, userId: string) {
  const familyId = db.users[userId]?.familyIds[0];
  return familyId ? db.families[familyId] ?? null : null;
}

export function unreadTotal(db: Database, userId: string): number {
  return conversationItems(db, userId).reduce((sum, item) => sum + (item.muted ? 0 : item.unread), 0);
}

export function notificationsFor(db: Database, userId: string): AppNotificationRecord[] {
  return db.notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function unreadNotifications(db: Database, userId: string): number {
  return db.notifications.filter((n) => n.userId === userId && !n.read).length;
}

export function dmBetween(db: Database, userId: string, otherId: string): ConversationRecord | null {
  return (
    Object.values(db.conversations).find(
      (c) => c.type === 'dm' && c.memberIds.length === 2 && c.memberIds.includes(userId) && c.memberIds.includes(otherId)
    ) ?? null
  );
}

export function groupConversations(db: Database, userId: string): ConversationItem[] {
  return conversationItems(db, userId).filter((item) => item.conv.type === 'group');
}
