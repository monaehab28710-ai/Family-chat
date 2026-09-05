import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../lib/theme';

export function Header({
  title,
  subtitle,
  onBack,
  right,
  emoji,
  color,
}: {
  title: string;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  right?: React.ReactNode;
  emoji?: string | null;
  color?: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.container, { borderBottomColor: theme.border, backgroundColor: theme.headerBg }]}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: theme.surfaceAlt, opacity: pressed ? 0.6 : 1, borderColor: theme.border },
            ]}
          >
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.titleWrap}>
        {emoji ? (
          <Animated.View
            entering={FadeIn.duration(220)}
            style={[styles.emojiBadge, { backgroundColor: color ?? theme.primarySoft }]}
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </Animated.View>
        ) : null}
        <View style={{ flexShrink: 1 }}>
          <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>
            {title}
          </Text>
          {subtitle ? <View style={styles.subtitleWrap}>{subtitle}</View> : null}
        </View>
      </View>

      <View style={[styles.side, styles.rightSide]}>{right}</View>
    </View>
  );
}

export function HeaderButton({
  icon,
  onPress,
  label,
  tone = 'default',
  active,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string;
  tone?: 'default' | 'danger';
  active?: boolean;
}) {
  const theme = useTheme();
  const color = tone === 'danger' ? theme.danger : active ? theme.primary : theme.text;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: active ? theme.primarySoft : theme.surfaceAlt,
          borderColor: theme.border,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={20} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  side: { minWidth: 42, flexDirection: 'row', alignItems: 'center' },
  rightSide: { justifyContent: 'flex-end', gap: 8 },
  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
  subtitleWrap: { marginTop: 1 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  emojiBadge: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 20 },
});
