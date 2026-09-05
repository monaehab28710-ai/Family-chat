import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Header, HeaderButton } from '../components/Header';
import { Field } from '../components/Field';
import { AppButton } from '../components/Button';
import { Chip } from '../components/Chip';
import { useTheme } from '../lib/theme';
import { signUp } from '../lib/api';
import { useToast } from '../lib/toast';
import { RELATIONSHIPS, type Relationship } from '../lib/types';
import { validateEmail, validateName, validatePassword } from '../lib/validation';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export function SignupScreen({ navigation }: Props) {
  const theme = useTheme();
  const { show } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const submit = async () => {
    const next: Record<string, string | undefined> = {};
    const nameCheck = validateName(name);
    if (!nameCheck.ok) next.name = nameCheck.message;
    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) next.email = emailCheck.message;
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.ok) next.password = passwordCheck.message;
    if (confirm !== password) next.confirm = 'Passwords do not match.';
    if (!relationship) next.relationship = 'Pick how you fit into the family.';
    setErrors(next);
    if (Object.keys(next).some((key) => next[key])) return;

    setBusy(true);
    try {
      await signUp({ name, email, password, relationship: relationship! });
      show('Account created - now set up your family', { tone: 'success', icon: 'happy' });
    } catch (error) {
      show((error as Error).message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title="Create account" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.duration(380)}>
            <Text style={[styles.title, { color: theme.text }]}>Join your family 💛</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              Your account is private - only people you invite can see your messages.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(380)} style={styles.form}>
            <Field
              label="Your name"
              icon="person-outline"
              placeholder="e.g. Alex Rivera"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
              }}
              error={errors.name}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              textContentType="name"
            />

            <Field
              ref={emailRef}
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
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              textContentType="emailAddress"
            />

            <Field
              ref={passwordRef}
              label="Password"
              icon="lock-closed-outline"
              placeholder="At least 8 characters"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
              }}
              error={errors.password}
              secure
              hint="Use 8+ characters with a letter and a number."
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              textContentType="newPassword"
            />

            <Field
              ref={confirmRef}
              label="Confirm password"
              icon="shield-checkmark-outline"
              placeholder="Repeat your password"
              value={confirm}
              onChangeText={(text) => {
                setConfirm(text);
                if (errors.confirm) setErrors((e) => ({ ...e, confirm: undefined }));
              }}
              error={errors.confirm}
              secure
              returnKeyType="done"
              onSubmitEditing={submit}
            />

            <View>
              <Text style={[styles.label, { color: theme.textMuted }]}>I AM THE...</Text>
              <View style={styles.chips}>
                {RELATIONSHIPS.map((item) => (
                  <Chip key={item} label={item} selected={relationship === item} onPress={() => setRelationship(item)} size="sm" />
                ))}
              </View>
              {errors.relationship ? (
                <View style={styles.inlineError}>
                  <Ionicons name="alert-circle" size={13} color={theme.danger} />
                  <Text style={[styles.inlineErrorText, { color: theme.danger }]}>{errors.relationship}</Text>
                </View>
              ) : null}
            </View>

            <AppButton label={busy ? 'Creating account...' : 'Continue'} onPress={submit} loading={busy} full size="lg" icon="arrow-forward" />

            <View style={[styles.privacy, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
              <Ionicons name="lock-closed" size={14} color={theme.success} />
              <Text style={[styles.privacyText, { color: theme.textMuted }]}>
                Passwords are salted and hashed before storage. Family groups are invite-only and never discoverable.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 22, paddingVertical: 22, paddingBottom: 48, maxWidth: 560, width: '100%', alignSelf: 'center' },
  title: { fontSize: 25, fontWeight: '900' },
  subtitle: { fontSize: 14, marginTop: 6, lineHeight: 20 },
  form: { gap: 14, marginTop: 22 },
  label: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inlineError: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, marginLeft: 4 },
  inlineErrorText: { fontSize: 12.5, fontWeight: '600' },
  privacy: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, marginTop: 4 },
  privacyText: { fontSize: 12.5, lineHeight: 18, flex: 1, fontWeight: '500' },
});
