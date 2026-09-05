import { AppState } from 'react-native';
import { getDatabase, mutate } from './store';
import { showLocalNotification } from './notifications';
import type { AppNotificationRecord, NotificationKind } from './types';

/** Conversations currently on screen - used to suppress redundant pushes. */
let activeConversationId: string | null = null;

export function setActiveConversation(conversationId: string | null) {
  activeConversationId = conversationId;
}

export function getActiveConversation() {
  return activeConversationId;
}

interface NotifyInput {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  emoji: string;
  conversationId?: string;
  familyId?: string;
  /** when false, only the in-app notification center is updated */
  push?: boolean;
}

export function notifyUser(input: NotifyInput) {
  let enabled = true;
  let previewEnabled = true;

  mutate((db) => {
    const user = db.users[input.userId];
    if (!user) return;
    enabled = user.settings.notificationsEnabled;
    previewEnabled = user.settings.previewTextEnabled;
    if (!enabled) return;

    const record: AppNotificationRecord = {
      id: `n_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      emoji: input.emoji,
      conversationId: input.conversationId,
      familyId: input.familyId,
      createdAt: Date.now(),
      // reading the chat right now should not badge the tab
      read: Boolean(input.conversationId) && activeConversationId === input.conversationId,
    };
    db.notifications.unshift(record);
    if (db.notifications.length > 150) db.notifications.length = 150;
  });

  if (input.push === false || !enabled) return;
  try {
    const user = getDatabase().users[input.userId];
    if (!user) return;
    const foreground = AppState.currentState === 'active';
    if (foreground && activeConversationId === input.conversationId) return;
    showLocalNotification(input.title, previewEnabled ? input.body : 'Sent you a message', {
      conversationId: input.conversationId ?? '',
      familyId: input.familyId ?? '',
    });
  } catch {
    // database not ready - in-app notifications already recorded
  }
}
