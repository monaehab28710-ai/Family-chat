import { useSyncExternalStore } from 'react';

/**
 * Lightweight presence/typing channel kept separate from the main database so
 * high-frequency typing pings never trigger expensive chat-list re-renders.
 */

type TypingState = Record<string, Record<string, number>>;

let state: TypingState = {};
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function setTyping(conversationId: string, userId: string, duration = 5000) {
  const key = `${conversationId}:${userId}`;
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  const conv = { ...(state[conversationId] ?? {}) };
  conv[userId] = Date.now() + duration;
  state = { ...state, [conversationId]: conv };
  timers.set(
    key,
    setTimeout(() => clearTyping(conversationId, userId), duration)
  );
  emit();
}

export function clearTyping(conversationId: string, userId: string) {
  const key = `${conversationId}:${userId}`;
  const existing = timers.get(key);
  if (existing) {
    clearTimeout(existing);
    timers.delete(key);
  }
  const conv = state[conversationId];
  if (!conv || conv[userId] === undefined) return;
  const nextConv = { ...conv };
  delete nextConv[userId];
  state = { ...state, [conversationId]: nextConv };
  emit();
}

export function typingUserIds(conversationId: string): string[] {
  const conv = state[conversationId];
  if (!conv) return [];
  const now = Date.now();
  return Object.keys(conv).filter((userId) => conv[userId] > now);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTypingUsers(conversationId: string): string[] {
  const key = useSyncExternalStore(
    subscribe,
    () => typingUserIds(conversationId).join(','),
    () => ''
  );
  return key ? key.split(',') : [];
}
