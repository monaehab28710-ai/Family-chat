import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../lib/theme';
import { AppButton } from './Button';

export function EmptyState({
  emoji,
  icon,
  title,
  message,
  actionLabel,
  onAction,
  compact,
}: {
  emoji?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeInUp.duration(320)} style={[styles.wrap, compact ? { paddingVertical: 24 } : null]}>
      <View style={[styles.badge, { backgroundColor: theme.primarySoft }]}>
        {emoji ? <Text style={{ fontSize: 30 }}>{emoji}</Text> : icon ? <Ionicons name={icon} size={30} color={theme.primary} /> : null}
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>
      {actionLabel && onAction ? <AppButton label={actionLabel} onPress={onAction} style={{ marginTop: 18 }} /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 48, gap: 8 },
  badge: { width: 76, height: 76, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  title: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: 14.5, textAlign: 'center', lineHeight: 21, maxWidth: 320 },
});
