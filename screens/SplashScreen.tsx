import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../lib/theme';
import { useApp } from '../lib/bootstrap';
import type { RootStackParamList } from '../navigation/types';
import { TypingDots } from '../components/TypingDots';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export function SplashScreen({ navigation }: Props) {
  const theme = useTheme();
  const { user } = useApp();
  const scale = useSharedValue(0.7);
  const glow = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 11, stiffness: 130 });
    glow.value = withDelay(200, withTiming(1, { duration: 900 }));
  }, [glow, scale]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const target = !user ? 'Auth' : user.familyIds.length > 0 ? 'Main' : 'FamilySetup';
      (navigation as unknown as { replace: (name: string) => void }).replace(target);
    }, 1600);
    return () => clearTimeout(timer);
  }, [navigation, user]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.18 * glow.value,
    transform: [{ scale: 0.9 + 0.35 * glow.value }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />
      <View style={styles.center}>
        <Animated.View style={[styles.glow, { backgroundColor: theme.primary }, glowStyle]} />
        <Animated.View style={logoStyle}>
          <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logo}>
            <Text style={styles.logoEmoji}>🏠</Text>
          </LinearGradient>
        </Animated.View>

        <Animated.Text entering={FadeIn.delay(260).duration(500)} style={[styles.title, { color: theme.text }]}>
          FamilyConnect
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(420).duration(500)} style={[styles.tagline, { color: theme.textMuted }]}>
          A private place for your family{'\u2764'}
        </Animated.Text>
      </View>

      <Animated.View entering={FadeIn.delay(700)} style={styles.footer}>
        <TypingDots color={theme.primary} />
        <Text style={[styles.footerText, { color: theme.textFaint }]}>Opening your family room...</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  center: { alignItems: 'center' },
  glow: { position: 'absolute', width: 260, height: 260, borderRadius: 130, top: -70 },
  logo: {
    width: 108,
    height: 108,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B4A',
    shadowOpacity: 0.45,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
    marginBottom: 26,
  },
  logoEmoji: { fontSize: 52 },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: 0.3 },
  tagline: { fontSize: 15, marginTop: 8, fontWeight: '600' },
  footer: { position: 'absolute', bottom: 64, alignItems: 'center', gap: 12 },
  footerText: { fontSize: 12.5, fontWeight: '600' },
});
