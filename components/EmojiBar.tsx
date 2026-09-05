import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../lib/theme';
import { QUICK_EMOJIS } from '../lib/seed';

/** Quick emoji row shown above the composer. */
export function EmojiBar({ onPick }: { onPick: (emoji: string) => void }) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(160)} style={[styles.wrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {QUICK_EMOJIS.map((emoji) => (
          <Pressable
            key={emoji}
            onPress={() => onPick(emoji)}
            accessibilityRole="button"
            accessibilityLabel={`Insert ${emoji}`}
            style={({ pressed }) => [styles.item, { backgroundColor: pressed ? theme.surfaceAlt : 'transparent' }]}
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 6 },
  content: { paddingHorizontal: 10, gap: 2, alignItems: 'center' },
  item: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 12 },
  emoji: { fontSize: 24 },
});
