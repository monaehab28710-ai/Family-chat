import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initDatabase, useDatabase } from './store';
import { initNotifications } from './notifications';
import { restoreSession, updateSettings } from './api';
import type { Database, ThemePreference, UserRecord } from './types';

const THEME_KEY = 'familyconnect.theme.v1';

interface AppValue {
  ready: boolean;
  db: Database | null;
  user: UserRecord | null;
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
}

const AppContext = createContext<AppValue>({
  ready: false,
  db: null,
  user: null,
  themePreference: 'system',
  setThemePreference: () => {},
});

/** Boots the local backend, restores the session and drives theme preference. */
export function AppProvider({ children }: { children: React.ReactNode }) {
  const db = useDatabase();
  const [ready, setReady] = useState(false);
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') setPreference(stored);
      } catch {
        // ignore
      }
      await initDatabase();
      initNotifications();
      const user = await restoreSession();
      if (user) setPreference(user.settings.theme);
      if (mounted) setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const user = db && db.session ? db.users[db.session.userId] ?? null : null;

  useEffect(() => {
    if (user && user.settings.theme !== preference) setPreference(user.settings.theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const setThemePreference = useCallback((next: ThemePreference) => {
    setPreference(next);
    AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
    try {
      updateSettings({ theme: next });
    } catch {
      // signed out - stored locally only
    }
  }, []);

  const value = useMemo<AppValue>(
    () => ({ ready, db, user, themePreference: preference, setThemePreference }),
    [ready, db, user, preference, setThemePreference]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
