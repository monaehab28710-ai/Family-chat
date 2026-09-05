import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Field } from '../components/Field';
import { AppButton } from '../components/Button';
import { useTheme } from '../lib/theme';
import { joinFamilyByCode } from '../lib/api';
import { useToast } from '../lib/toast';
import { DEMO_FAMILY_CODE } from '../lib/seed';
import { groupCode } from '../lib/format';
import { normalizeCode, validateCode } from '../lib/validation';
import type { FamilySetupStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<FamilySetupStackParamList, 'JoinFamily'>;

export function JoinFamilyScreen({ navigation }: Props) {
  const theme = useTheme();
  const { show } = useToast();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const check = validateCode(code);
    if (!check.ok) {
      setError(check.message ?? 'Invalid code.');
      return;
    }
    setBusy(true);
    try {
      const family = joinFamilyByCode(code);
      show(`Welcome to ${family.name} ${family.emoji}`, { tone: 'success', icon: 'happy' });
      (navigation.getParent() as unknown as { replace: (name: string) => void } | undefined)?.replace('Main');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title="Join a family" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.duration(400)}>
            <Text style={[styles.title, { color: theme.text }]}>Enter your invitation code</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              A relative shares this code from their Family tab. Codes are the only way in - families can never be searched or discovered.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(90).duration(400)} style={styles.form}>
            <View style={[styles.codeBox, { backgroundColor: theme.surface, borderColor: error ? theme.danger : theme.border }]}>
              <Ionicons name="key" size={20} color={theme.primary} />
              <Field
                placeholder="XXXX-XXXX"
                value={groupCode(code)}
                onChangeText={(text) => {
                  setCode(normalizeCode(text));
                  if (error) setError(null);
                }}
                error={error}
                autoCapitalize="characters"
                autoCorrect={false}
                keyboardType="ascii-capable"
                returnKeyType="done"
                onSubmitEditing={submit}
                maxLength={9}
                style={styles.codeInput}
                containerStyle={{ flex: 1 }}
                accessibilityLabel="Invitation code"
              />
            </View>

            <View style={[styles.note, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
              <Ionicons name="shield-checkmark" size={16} color={theme.success} />
              <Text style={[styles.noteText, { color: theme.textMuted }]}>
                Every code is checked against the family that issued it. Nothing else about the family is revealed to you before you join.
              </Text>
            </View>

            <AppButton label={busy ? 'Checking code...' : 'Join family'} onPress={submit} loading={busy} full size="lg" icon="people" />

            <Pressable
              onPress={() => setCode(DEMO_FAMILY_CODE)}
              style={styles.demo}
              accessibilityRole="button"
              accessibilityLabel="Use the demo invitation code"
            >
              <Ionicons name="sparkles" size={14} color={theme.accent} />
              <Text style={[styles.demoText, { color: theme.accent }]}>Try the demo code {DEMO_FAMILY_CODE}</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 22, paddingVertical: 24, paddingBottom: 48, maxWidth: 560, width: '100%', alignSelf: 'center' },
  title: { fontSize: 25, fontWeight: '900' },
  subtitle: { fontSize: 14, marginTop: 8, lineHeight: 21 },
  form: { gap: 18, marginTop: 24 },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  codeInput: { fontSize: 22, fontWeight: '900', letterSpacing: 6, paddingVertical: 14 },
  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  noteText: { fontSize: 12.5, lineHeight: 18, flex: 1, fontWeight: '500' },
  demo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  demoText: { fontSize: 13, fontWeight: '800' },
});
