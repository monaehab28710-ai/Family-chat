import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../lib/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Chip({
  label,
  selected,
  onPress,
  icon,
  size = 'md',
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: 'sm' | 'md';
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.95, { damping: 18, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 260 });
      }}
      style={[
        animatedStyle,
        styles.chip,
        {
          paddingVertical: size === 'sm' ? 7 : 10,
          paddingHorizontal: size === 'sm' ? 12 : 14,
          borderRadius: size === 'sm' ? 12 : 14,
          backgroundColor: selected ? theme.primary : theme.surfaceAlt,
          borderColor: selected ? theme.primary : theme.border,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={size === 'sm' ? 13 : 15} color={selected ? '#FFFFFF' : theme.textMuted} /> : null}
      <Text style={[styles.text, { color: selected ? '#FFFFFF' : theme.text, fontSize: size === 'sm' ? 13 : 14 }]}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { fontWeight: '700' },
});
