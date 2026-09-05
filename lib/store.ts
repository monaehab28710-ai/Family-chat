import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import type { Database } from './types';
import { buildSeedDatabase } from './seed';

/**
 * FamilyConnect local backend.
 *
 * This module is the single source of truth for all data. It mirrors the
 * document/collection layout of the production Firestore schema described in
 * docs/SCHEMA.md, persists to device storage and pushes immutable snapshots to
 * subscribers, giving every screen the same real-time semantics a socket based
 * backend would provide.
 */

const STORAGE_KEY = 'familyconnect.db.v3';

type Listener = () => void;

let snapshot: Database | null = null;
const listeners = new Set<Listener>();
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let initPromise: Promise<Database> | null = null;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function emit() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      // never let a bad subscriber break the store
      console.warn('subscriber failed', e);
    }
  });
}

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    if (!snapshot) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)).catch(() => {});
  }, 250);
}

export async function initDatabase(): Promise<Database> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Database;
        if (parsed && parsed.users && parsed.seededAt) {
          snapshot = parsed;
        }
      }
    } catch {
      snapshot = null;
    }
    if (!snapshot) {
      snapshot = buildSeedDatabase();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)).catch(() => {});
    }
    emit();
    return snapshot;
  })();
  return initPromise;
}

export function getDatabase(): Database {
  if (!snapshot) throw new Error('Database is not ready yet');
  return snapshot;
}

export function isDatabaseReady(): boolean {
  return snapshot !== null;
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Applies a recipe to an immutable copy of the database and notifies everyone. */
export function mutate(recipe: (draft: Database) => void, options?: { persist?: boolean }) {
  if (!snapshot) return;
  const draft = clone(snapshot);
  recipe(draft);
  draft.seededAt = draft.seededAt; // keep schema version marker stable
  snapshot = draft;
  emit();
  if (options?.persist !== false) schedulePersist();
}

export async function resetDatabase(): Promise<Database> {
  snapshot = buildSeedDatabase();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)).catch(() => {});
  emit();
  return snapshot;
}

export async function wipeStorage() {
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

/** Subscribes a component to the whole immutable snapshot. */
export function useDatabase(): Database | null {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => snapshot
  );
}

export function uid(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}${Date.now().toString(36)}${rand}`;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateInviteCode(): string {
  let out = '';
  for (let i = 0; i < 8; i++) out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return out;
}

/** Deterministic pseudo-random peaks so voice notes render a stable waveform. */
export function peaksFor(seed: string, count = 34): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const peaks: number[] = [];
  for (let i = 0; i < count; i++) {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    const base = (Math.abs(h) % 1000) / 1000;
    const envelope = Math.sin((i / count) * Math.PI) * 0.55 + 0.45;
    peaks.push(Math.max(0.18, Math.min(1, base * envelope + 0.18)));
  }
  return peaks;
}
