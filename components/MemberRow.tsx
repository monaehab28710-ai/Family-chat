import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../lib/theme';
import { Avatar } from './Avatar';
import type { UserRecord } from '../lib/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function MemberRow({
  user,
  subtitle,
  onPress,
  right,
  badge,
  dim,
  selfId,
}: {
  user: UserRecord;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  badge?: string | null;
  dim?: boolean;
  selfId?: string;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const isSelf = selfId === user.id;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.99, { damping: 20, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 260 });
      }}
      style={[
        animated,
        styles.row,
        { backgroundColor: theme.surface, borderColor: theme.border, opacity: dim ? 0.62 : 1 },
      ]}
    >
      <Avatar name={user.name} color={user.avatarColor} emoji={user.avatarEmoji} size={50} online={user.online} />
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={[styles.name, { color: theme.text }]}>
            {user.name}
            {isSelf ? <Text style={{ color: theme.textFaint, fontWeight: '600' }}>  (You)</Text> : null}
          </Text>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: theme.accentSoft }]}>
              <Ionicons name="shield-checkmark" size={10} color={theme.accent} />
              <Text style={[styles.badgeText, { color: theme.accent }]}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text numberOfLines={1} style={[styles.subtitle, { color: theme.textMuted }]}>
          {subtitle ?? (user.online ? 'Online now' : user.relationship)}
        </Text>
      </View>
      {right ?? <Ionicons name="chevron-forward" size={17} color={theme.textFaint} />}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  name: { fontSize: 15.5, fontWeight: '800', flexShrink: 1 },
  subtitle: { fontSize: 13, fontWeight: '600' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
});
