import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../lib/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  disabled,
  full,
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const heights: Record<Size, number> = { sm: 38, md: 50, lg: 56 };
  const fontSizes: Record<Size, number> = { sm: 14, md: 15.5, lg: 16.5 };
  const paddings: Record<Size, string> = { sm: '12px 16px', md: '14px 20px', lg: '16px 24px' };

  const isDisabled = disabled || loading;
  const textColor =
    variant === 'primary' || variant === 'danger'
      ? '#FFFFFF'
      : variant === 'ghost'
      ? theme.primary
      : variant === 'outline'
      ? theme.text
      : theme.primary;

  const content = (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : icon ? (
        <Ionicons name={icon} size={size === 'sm' ? 15 : 18} color={textColor} />
      ) : null}
      <Text
        numberOfLines={1}
        style={[styles.label, { color: textColor, fontSize: fontSizes[size], paddingHorizontal: paddings[size] ? undefined : undefined }]}
      >
        {label}
      </Text>
    </>
  );

  const shell: ViewStyle = {
    minHeight: heights[size],
    borderRadius: size === 'sm' ? 12 : 16,
    paddingHorizontal: size === 'sm' ? 14 : size === 'lg' ? 22 : 18,
    alignSelf: full ? 'stretch' : 'flex-start',
    width: full ? '100%' : undefined,
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={isDisabled}
      onPressIn={() => {
        scale.value = withSpring(0.965, { damping: 18, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 260 });
      }}
      onPress={onPress}
      style={[animatedStyle, styles.base, shell, style, isDisabled ? { opacity: 0.55 } : null]}
    >
      {variant === 'primary' || variant === 'danger' ? (
        <LinearGradient
          colors={variant === 'danger' ? [theme.danger, '#C6343B'] : theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, shell]}
        >
          {content}
        </LinearGradient>
      ) : (
        <>
          {content}
        </>
      )}
      {variant === 'secondary' ? null : null}
    </AnimatedPressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  tone = 'default',
  size = 44,
  filled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string;
  tone?: 'default' | 'primary' | 'danger';
  size?: number;
  filled?: boolean;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const color = tone === 'danger' ? theme.danger : tone === 'primary' ? theme.primary : theme.text;
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => {
        scale.value = withSpring(0.9, { damping: 18, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 260 });
      }}
      onPress={onPress}
      style={[
        animatedStyle,
        styles.iconShell,
        {
          width: size,
          height: size,
          borderRadius: size / 3.2,
          backgroundColor: filled ? (tone === 'danger' ? theme.danger : theme.primary) : theme.surfaceAlt,
          borderColor: theme.border,
        },
      ]}
    >
      <Ionicons name={icon} size={size * 0.46} color={filled ? '#FFFFFF' : color} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  label: { fontWeight: '800', letterSpacing: 0.2 },
  iconShell: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
});
