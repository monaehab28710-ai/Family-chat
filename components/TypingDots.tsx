import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useTheme } from '../lib/theme';

function Dot({ delay, color }: { delay: number; color: string }) {
  const value = useSharedValue(0);
  useEffect(() => {
    value.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 320 }), withTiming(0, { duration: 320 })), -1, false));
  }, [delay, value]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -3 * value.value }],
    opacity: 0.45 + 0.55 * value.value,
  }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

export function TypingDots({ color }: { color?: string }) {
  const theme = useTheme();
  const dotColor = color ?? theme.textMuted;
  return (
    <View style={styles.row} accessibilityLabel="Typing">
      <Dot delay={0} color={dotColor} />
      <Dot delay={140} color={dotColor} />
      <Dot delay={280} color={dotColor} />
    </View>
  );
}

export function TypingBubble({ color }: { color?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.bubble, { backgroundColor: theme.bubbleOther, borderColor: theme.bubbleOtherBorder }]}>
      <TypingDots color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderTopLeftRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
});
