import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Field } from '../components/Field';
import { AppButton } from '../components/Button';
import { useTheme } from '../lib/theme';
import { signIn, signInDemo } from '../lib/api';
import { useToast } from '../lib/toast';
import { validateEmail } from '../lib/validation';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const theme = useTheme();
  const { show } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState<null | 'login' | 'demo'>(null);
  const passwordRef = useRef<TextInput>(null);

  const submit = async () => {
    const next: typeof errors = {};
    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) next.email = emailCheck.message;
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy('login');
    try {
      await signIn(email, password);
      show('Welcome back to your family 💛', { tone: 'success', icon: 'happy' });
    } catch (error) {
      setErrors({ form: (error as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const demo = async () => {
    setBusy('demo');
    try {
      await signInDemo();
      show('Opened the Rivera family demo', { tone: 'success', icon: 'sparkles' });
    } catch (error) {
      show((error as Error).message, { tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.duration(420)} style={styles.brand}>
            <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logo}>
              <Text style={styles.logoEmoji}>🏠</Text>
            </LinearGradient>
            <Text style={[styles.appName, { color: theme.textMuted }]}>FAMILYCONNECT</Text>
            <Text style={[styles.title, { color: theme.text }]}>Welcome back 👋</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              Sign in to pick up the conversation with your family.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(420)} style={styles.form}>
            {errors.form ? (
              <View style={[styles.errorBox, { backgroundColor: theme.name === 'dark' ? '#3A1E20' : '#FDECEC', borderColor: theme.danger }]}>
                <Ionicons name="alert-circle" size={17} color={theme.danger} />
                <Text style={[styles.errorText, { color: theme.danger }]}>{errors.form}</Text>
              </View>
            ) : null}

            <Field
              label="Email address"
              icon="mail-outline"
              placeholder="you@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
              }}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              textContentType="emailAddress"
            />

            <Field
              ref={passwordRef}
              label="Password"
              icon="lock-closed-outline"
              placeholder="Your password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
              }}
              error={errors.password}
              secure
              returnKeyType="done"
              onSubmitEditing={submit}
              textContentType="password"
            />

            <Pressable
              onPress={() => {
                if (!validateEmail(email).ok) {
                  setErrors({ email: 'Enter your email first so we know where to send it.' });
                  return;
                }
                show(`Password reset link sent to ${email.trim().toLowerCase()}`, { icon: 'mail-unread' });
              }}
              style={styles.forgot}
              accessibilityRole="button"
              accessibilityLabel="Forgot password"
            >
              <Ionicons name="key-outline" size={14} color={theme.primary} />
              <Text style={[styles.forgotText, { color: theme.primary }]}>Forgot password?</Text>
            </Pressable>

            <AppButton label={busy === 'login' ? 'Signing in...' : 'Sign in'} onPress={submit} loading={busy === 'login'} full size="lg" />

            <View style={styles.dividerRow}>
              <View style={[styles.line, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textFaint }]}>or</Text>
              <View style={[styles.line, { backgroundColor: theme.border }]} />
            </View>

            <AppButton
              label="Explore the demo family"
              icon="sparkles"
              variant="secondary"
              onPress={demo}
              loading={busy === 'demo'}
              full
            />
            <Text style={[styles.demoHint, { color: theme.textFaint }]}>Opens a ready-made family with 5 relatives so you can try everything instantly.</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(220)} style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textMuted }]}>New to FamilyConnect?</Text>
            <Pressable onPress={() => navigation.navigate('Signup')} accessibilityRole="button" accessibilityLabel="Create an account">
              <Text style={[styles.footerLink, { color: theme.primary }]}>Create your account</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40, maxWidth: 520, width: '100%', alignSelf: 'center' },
  brand: { alignItems: 'center', marginBottom: 28 },
  logo: { width: 76, height: 76, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoEmoji: { fontSize: 36 },
  appName: { fontSize: 11.5, fontWeight: '900', letterSpacing: 2.2 },
  title: { fontSize: 27, fontWeight: '900', marginTop: 8 },
  subtitle: { fontSize: 14.5, textAlign: 'center', marginTop: 6, lineHeight: 20, maxWidth: 320 },
  form: { gap: 14 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  errorText: { fontSize: 13, fontWeight: '600', flex: 1 },
  forgot: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-end', paddingVertical: 2 },
  forgotText: { fontSize: 13, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 2 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 12, fontWeight: '700' },
  demoHint: { fontSize: 12, textAlign: 'center', lineHeight: 17, paddingHorizontal: 10 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 30 },
  footerText: { fontSize: 14, fontWeight: '600' },
  footerLink: { fontSize: 14, fontWeight: '800' },
});
