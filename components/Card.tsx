import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../lib/theme';

export function Card({
  children,
  style,
  padded = true,
  onPress,
  onLongPress,
  tone = 'surface',
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  padded?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  tone?: 'surface' | 'alt' | 'primary';
}) {
  const theme = useTheme();
  const background = tone === 'alt' ? theme.surfaceAlt : tone === 'primary' ? theme.primarySoft : theme.surface;
  const base: ViewStyle = {
    backgroundColor: background,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    padding: padded ? 16 : 0,
    shadowColor: theme.shadow,
    shadowOpacity: theme.name === 'dark' ? 0.35 : 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  };

  if (onPress || onLongPress) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [base, style as ViewStyle, pressed ? { opacity: 0.86, transform: [{ scale: 0.995 }] } : null]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style as ViewStyle]}>{children}</View>;
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const theme = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border, marginLeft: inset }} />;
}
