import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Avatar } from '../components/Avatar';
import { Field } from '../components/Field';
import { Chip } from '../components/Chip';
import { AppButton } from '../components/Button';
import { useTheme } from '../lib/theme';
import { useApp } from '../lib/bootstrap';
import { updateProfile } from '../lib/api';
import { useToast } from '../lib/toast';
import { AVATAR_COLORS } from '../lib/seed';
import { RELATIONSHIPS, type Relationship } from '../lib/types';
import { validateName } from '../lib/validation';
import type { RootStackParamList } from '../navigation/types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

const AVATAR_EMOJIS: (string | null)[] = [null, '🌻', '🧡', '🐱', '⚽️', '🎨', '📚', '🌈', '🎧'];

export function EditProfileScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Navigation>();
  const { user } = useApp();
  const { show } = useToast();

  const [name, setName] = useState(user?.name ?? '');
  const [relationship, setRelationship] = useState<Relationship>(user?.relationship ?? 'Other');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [color, setColor] = useState(user?.avatarColor ?? AVATAR_COLORS[0]);
  const [emoji, setEmoji] = useState<string | null>(user?.avatarEmoji ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return <Screen />;

  const save = () => {
    const check = validateName(name);
    if (!check.ok) {
      setError(check.message ?? 'Invalid name.');
      return;
    }
    setBusy(true);
    try {
      updateProfile({ name, relationship, bio, avatarColor: color, avatarEmoji: emoji });
      show('Profile updated 💛', { tone: 'success', icon: 'happy' });
      navigation.goBack();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title="Edit profile" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.duration(320)} style={styles.preview}>
            <Avatar name={name || user.name} color={color} emoji={emoji} size={104} ring />
            <Text style={[styles.previewName, { color: theme.text }]}>{name || user.name}</Text>
            <Text style={[styles.previewHint, { color: theme.textMuted }]}>This is how your family sees you</Text>
          </Animated.View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.textMuted }]}>AVATAR COLOR</Text>
            <View style={styles.swatches}>
              {AVATAR_COLORS.map((item) => (
                <View key={item} style={styles.swatchWrap}>
                  <Chip label=" " selected={color === item} onPress={() => setColor(item)} />
                  <View style={[styles.swatch, { backgroundColor: item, borderColor: color === item ? theme.text : 'transparent' }]} />
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.textMuted }]}>AVATAR EMOJI (OPTIONAL)</Text>
            <View style={styles.emojiRow}>
              {AVATAR_EMOJIS.map((item, index) => (
                <Chip
                  key={index}
                  label={item ?? 'Aa'}
                  selected={(emoji ?? null) === item}
                  onPress={() => setEmoji(item)}
                  size="sm"
                />
              ))}
            </View>
          </View>

          <View style={styles.form}>
            <Field
              label="Display name"
              icon="person-outline"
              value={name}
              onChangeText={(text) => {
                setName(text);
                setError(null);
              }}
              error={error}
              autoCapitalize="words"
              maxLength={40}
              returnKeyType="done"
            />

            <View>
              <Text style={[styles.label, { color: theme.textMuted }]}>YOUR RELATIONSHIP</Text>
              <View style={styles.chips}>
                {RELATIONSHIPS.map((item) => (
                  <Chip key={item} label={item} size="sm" selected={relationship === item} onPress={() => setRelationship(item)} />
                ))}
              </View>
            </View>

            <Field
              label="About you"
              icon="heart-outline"
              placeholder="A short line your family will see"
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={140}
              hint={`${bio.length}/140 characters`}
            />

            <AppButton label={busy ? 'Saving...' : 'Save changes'} onPress={save} loading={busy} full size="lg" />

            <View style={[styles.note, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
              <Ionicons name="information-circle" size={15} color={theme.primary} />
              <Text style={[styles.noteText, { color: theme.textMuted }]}>
                Only members of your family group can see your profile details.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 60, maxWidth: 560, width: '100%', alignSelf: 'center' },
  preview: { alignItems: 'center', gap: 6, marginBottom: 24 },
  previewName: { fontSize: 19, fontWeight: '900', marginTop: 8 },
  previewHint: { fontSize: 12.5, fontWeight: '600' },
  section: { marginBottom: 20 },
  label: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatchWrap: { width: 44 },
  swatch: { position: 'absolute', top: 13, left: 13, width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  form: { gap: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  noteText: { fontSize: 12.5, lineHeight: 18, flex: 1, fontWeight: '500' },
});
