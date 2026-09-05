import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './theme';

type ToastTone = 'default' | 'success' | 'error';

interface ToastState {
  message: string;
  tone: ToastTone;
  icon: string;
  key: number;
}

interface ToastApi {
  show: (message: string, options?: { tone?: ToastTone; icon?: string }) => void;
}

const ToastContext = createContext<ToastApi>({ show: () => {} });

const TONE_ICONS: Record<ToastTone, string> = {
  default: 'information-circle',
  success: 'checkmark-circle',
  error: 'alert-circle',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, options?: { tone?: ToastTone; icon?: string }) => {
    setToast({
      message,
      tone: options?.tone ?? 'default',
      icon: options?.icon ?? TONE_ICONS[options?.tone ?? 'default'],
      key: Date.now(),
    });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast ? (
        <Animated.View
          key={toast.key}
          entering={FadeInDown.springify().damping(18)}
          exiting={FadeOutDown.duration(180)}
          pointerEvents="none"
          style={[
            styles.toast,
            {
              bottom: insets.bottom + 92,
              backgroundColor: theme.name === 'dark' ? '#2E241E' : '#33241C',
              borderColor: theme.border,
            },
          ]}
        >
          <Ionicons
            name={toast.icon as keyof typeof Ionicons.glyphMap}
            size={18}
            color={toast.tone === 'error' ? '#FF8A8A' : toast.tone === 'success' ? '#6FE3B4' : theme.accent}
          />
          <Text style={styles.text} numberOfLines={2}>
            {toast.message}
          </Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    maxWidth: 460,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  text: {
    color: '#FFF6EF',
    fontSize: 14,
    flex: 1,
    fontWeight: '600',
  },
});
