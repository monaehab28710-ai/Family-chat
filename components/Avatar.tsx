import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { initialsOf } from '../lib/format';
import { useTheme } from '../lib/theme';
import { resolveImageSource } from '../lib/media';

export function Avatar({
  name,
  color,
  size = 48,
  emoji,
  imageUri,
  online,
  ring,
  dim,
  style,
}: {
  name: string;
  color: string;
  size?: number;
  emoji?: string | null;
  imageUri?: string | null;
  online?: boolean;
  ring?: boolean;
  dim?: boolean;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const radius = size / 2;
  const fontSize = emoji ? size * 0.46 : size * 0.36;

  return (
    <View style={[{ width: size, height: size }, style]}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: color,
            opacity: dim ? 0.55 : 1,
            shadowColor: color,
            shadowOpacity: 0.35,
            shadowRadius: size * 0.18,
            shadowOffset: { width: 0, height: size * 0.08 },
            elevation: 2,
          },
          ring ? { borderWidth: Math.max(2, size * 0.05), borderColor: theme.surface } : null,
        ]}
      >
        {imageUri ? (
          <Image source={resolveImageSource(imageUri)} style={{ width: size, height: size, borderRadius: radius }} contentFit="cover" transition={180} />
        ) : (
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize }} allowFontScaling={false}>
            {emoji ?? initialsOf(name)}
          </Text>
        )}
      </View>
      {online !== undefined ? (
        <View
          style={[
            styles.presence,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              backgroundColor: online ? theme.online : theme.textFaint,
              borderColor: theme.surface,
              borderWidth: Math.max(1.5, size * 0.05),
            },
          ]}
        />
      ) : null}
    </View>
  );
}

export function AvatarStack({
  people,
  size = 34,
  max = 3,
  color,
  emoji,
}: {
  people: { id: string; name: string; avatarColor: string; avatarEmoji?: string | null }[];
  size?: number;
  max?: number;
  color?: string;
  emoji?: string | null;
}) {
  const theme = useTheme();
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <View style={styles.stackRow}>
      {emoji ? (
        <View style={[styles.stackAvatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color ?? theme.primary }]}>
          <Text style={{ fontSize: size * 0.45 }}>{emoji}</Text>
        </View>
      ) : (
        shown.map((person, index) => (
          <View key={person.id} style={{ marginLeft: index === 0 ? 0 : -size * 0.32 }}>
            <Avatar name={person.name} color={person.avatarColor} emoji={person.avatarEmoji} size={size} ring />
          </View>
        ))
      )}
      {extra > 0 ? (
        <View
          style={[
            styles.stackAvatar,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: theme.surfaceAlt,
              borderWidth: 2,
              borderColor: theme.surface,
              marginLeft: -size * 0.32,
            },
          ]}
        >
          <Text style={{ color: theme.textMuted, fontWeight: '800', fontSize: size * 0.32 }}>+{extra}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  presence: { position: 'absolute', right: -1, bottom: -1 },
  stackRow: { flexDirection: 'row', alignItems: 'center' },
  stackAvatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
