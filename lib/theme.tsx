import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import type { ThemePreference } from './types';

export interface Theme {
  name: 'light' | 'dark';
  bg: string;
  bgAlt: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  gradient: [string, string];
  accent: string;
  accentSoft: string;
  success: string;
  online: string;
  danger: string;
  warning: string;
  bubbleOwnText: string;
  bubbleOther: string;
  bubbleOtherText: string;
  bubbleOtherBorder: string;
  tabBar: string;
  tabBarBorder: string;
  tabInactive: string;
  headerBg: string;
  inputBg: string;
  overlay: string;
  shadow: string;
  badge: string;
  quote: string;
}

export const lightTheme: Theme = {
  name: 'light',
  bg: '#FFF8F2',
  bgAlt: '#FFEEE3',
  surface: '#FFFFFF',
  surfaceAlt: '#FFF3EB',
  border: '#F2E3D7',
  text: '#2B211B',
  textMuted: '#8B7566',
  textFaint: '#B7A395',
  primary: '#FF6B4A',
  primaryDark: '#EA5334',
  primarySoft: '#FFE9E1',
  gradient: ['#FF8A5B', '#FF6B4A'],
  accent: '#FFB25C',
  accentSoft: '#FFF1DC',
  success: '#2FB98A',
  online: '#33C08D',
  danger: '#E5484D',
  warning: '#F5A524',
  bubbleOwnText: '#FFFFFF',
  bubbleOther: '#FFFFFF',
  bubbleOtherText: '#2B211B',
  bubbleOtherBorder: '#F1E3D7',
  tabBar: 'rgba(255,252,249,0.95)',
  tabBarBorder: '#EFE0D4',
  tabInactive: '#A99384',
  headerBg: 'rgba(255,248,242,0.94)',
  inputBg: '#FFF3EB',
  overlay: 'rgba(38,22,15,0.45)',
  shadow: '#7A4A34',
  badge: '#FF4D4F',
  quote: '#F6EBE2',
};

export const darkTheme: Theme = {
  name: 'dark',
  bg: '#15100D',
  bgAlt: '#1E1613',
  surface: '#211915',
  surfaceAlt: '#2A201A',
  border: '#39291F',
  text: '#F8EEE7',
  textMuted: '#B49C8C',
  textFaint: '#8B7466',
  primary: '#FF7A55',
  primaryDark: '#F0603D',
  primarySoft: '#3A241B',
  gradient: ['#FF9866', '#FF6B4A'],
  accent: '#FFB25C',
  accentSoft: '#3A2C1A',
  success: '#3ED598',
  online: '#3ED598',
  danger: '#FF6369',
  warning: '#F5A524',
  bubbleOwnText: '#FFFFFF',
  bubbleOther: '#241B16',
  bubbleOtherText: '#F8EEE7',
  bubbleOtherBorder: '#39291F',
  tabBar: 'rgba(30,22,18,0.96)',
  tabBarBorder: '#33251C',
  tabInactive: '#8B7466',
  headerBg: 'rgba(21,16,13,0.94)',
  inputBg: '#2A201A',
  overlay: 'rgba(0,0,0,0.62)',
  shadow: '#000000',
  badge: '#FF6369',
  quote: '#2E241E',
};

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  preference: 'system',
  setPreference: () => {},
});

export function ThemeProvider({
  preference,
  setPreference,
  children,
}: {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  children: React.ReactNode;
}) {
  const scheme = useColorScheme();
  const value = useMemo<ThemeContextValue>(() => {
    const resolved = preference === 'system' ? (scheme === 'dark' ? 'dark' : 'light') : preference;
    return {
      theme: resolved === 'dark' ? darkTheme : lightTheme,
      preference,
      setPreference,
    };
  }, [preference, scheme, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

export function useThemeController() {
  return useContext(ThemeContext);
}

export function shadow(level: 1 | 2 | 3 = 1) {
  return {
    shadowColor: '#7A4A34',
    shadowOpacity: 0.1 * level,
    shadowRadius: 6 * level,
    shadowOffset: { width: 0, height: 2 * level },
    elevation: 2 * level,
  };
}
