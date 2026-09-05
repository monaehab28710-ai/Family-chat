import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Field } from '../components/Field';
import { AppButton } from '../components/Button';
import { useTheme } from '../lib/theme';
import { createFamily } from '../lib/api';
import { useToast } from '../lib/toast';
import { useApp } from '../lib/bootstrap';
import { AVATAR_COLORS, FAMILY_EMOJIS } from '../lib/seed';
import type { FamilySetupStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<FamilySetupStackParamList, 'CreateFamily'>;

export function CreateFamilyScreen({ navigation }: Props) {
  const theme = useTheme();
  const { show } = useToast();
  const { user } = useApp();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(FAMILY_EMOJIS[0]);
  const [color, setColor] = useState(AVATAR_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const previewName = useMemo(() => (name.trim() ? `${name.trim()}'s Family` : 'Our Family'), [name]);

  const submit = async () => {
    if (name.trim().length < 2) {
      setError('Give your family group a name (2 characters or more).');
      return;
    }
    setBusy(true);
    try {
      const family = createFamily({ name: name.trim(), emoji, color });
      show(`${family.emoji} ${family.name} is ready - invite your relatives!`, { tone: 'success', icon: 'happy' });
      (navigation.getParent() as unknown as { replace: (name: string) => void } | undefined)?.replace('Main');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.duration(400)}>
            <View style={[styles.stepBadge, { backgroundColor: theme.primarySoft }]}>
              <Text style={[styles.stepText, { color: theme.primary }]}>STEP 1 OF 2</Text>
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Create your family {emoji}</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              This is your private space. Only people you invite with the code can ever see it.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(90).duration(400)}>
            <LinearGradient
              colors={[color, theme.name === 'dark' ? '#2A201A' : '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.preview, { borderColor: theme.border }]}
            >
              <View style={[styles.previewEmoji, { backgroundColor: color }]}>
                <Text style={{ fontSize: 26 }}>{emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={[styles.previewTitle, { color: theme.name === 'dark' ? theme.text : '#2B211B' }]}>
                  {previewName}
                </Text>
                <Text style={[styles.previewMeta, { color: theme.name === 'dark' ? theme.textMuted : 'rgba(43,33,27,0.6)' }]}>
                  1 member · invite-only
                </Text>
              </View>
              <Ionicons name="lock-closed" size={17} color={theme.name === 'dark' ? theme.text : '#2B211B'} />
            </LinearGradient>
          </Animated.View>

          <View style={styles.form}>
            <Field
              label="Family name"
              icon="home-outline"
              placeholder="e.g. The Rivera Family"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (error) setError(null);
              }}
              error={error}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={submit}
              maxLength={40}
            />

            <View>
              <Text style={[styles.label, { color: theme.textMuted }]}>PICK AN EMOJI</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow}>
                {FAMILY_EMOJIS.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => setEmoji(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Emoji ${item}`}
                    style={[
                      styles.emojiChip,
                      {
                        backgroundColor: emoji === item ? color : theme.surface,
                        borderColor: emoji === item ? color : theme.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 22 }}>{item}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View>
              <Text style={[styles.label, { color: theme.textMuted }]}>FAMILY COLOR</Text>
              <View style={styles.colorRow}>
                {AVATAR_COLORS.slice(0, 8).map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => setColor(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Color ${item}`}
                    style={[styles.colorDot, { backgroundColor: item, borderColor: color === item ? theme.text : 'transparent' }]}
                  >
                    {color === item ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                  </Pressable>
                ))}
              </View>
            </View>

            <AppButton label={busy ? 'Creating...' : 'Create family'} onPress={submit} loading={busy} full size="lg" />

            <Pressable
              onPress={() => navigation.navigate('JoinFamily')}
              style={styles.switch}
              accessibilityRole="button"
              accessibilityLabel="Join an existing family instead"
            >
              <Ionicons name="people-outline" size={15} color={theme.primary} />
              <Text style={[styles.switchText, { color: theme.primary }]}>Someone already made one? Join their family</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 22, paddingVertical: 26, paddingBottom: 48, maxWidth: 560, width: '100%', alignSelf: 'center' },
  stepBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginBottom: 12 },
  stepText: { fontSize: 10.5, fontWeight: '900', letterSpacing: 1.1 },
  title: { fontSize: 26, fontWeight: '900' },
  subtitle: { fontSize: 14.5, marginTop: 8, lineHeight: 21 },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 22,
  },
  previewEmoji: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  previewTitle: { fontSize: 16.5, fontWeight: '900' },
  previewMeta: { fontSize: 12.5, fontWeight: '600', marginTop: 3 },
  form: { gap: 18, marginTop: 24 },
  label: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
  emojiRow: { gap: 8, paddingRight: 12 },
  emojiChip: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  switch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  switchText: { fontSize: 13.5, fontWeight: '800' },
});
