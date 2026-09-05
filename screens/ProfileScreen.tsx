import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Screen } from '../components/Screen';
import { Avatar } from '../components/Avatar';
import { Card } from '../components/Card';
import { LinkRow } from '../components/Rows';
import { AppButton } from '../components/Button';
import { SectionHeader } from '../components/SectionHeader';
import { ActionSheet } from '../components/ActionSheet';
import { useTheme } from '../lib/theme';
import { useApp } from '../lib/bootstrap';
import { conversationItems, myFamily } from '../lib/selectors';
import { maskEmail } from '../lib/validation';
import { useToast } from '../lib/toast';
import { signOut } from '../lib/api';
import type { RootStackParamList } from '../navigation/types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function ProfileScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Navigation>();
  const { db, user } = useApp();
  const { show } = useToast();
  const [confirmOut, setConfirmOut] = React.useState(false);

  if (!db || !user) return <Screen />;

  const family = myFamily(db, user.id);
  const chatCount = conversationItems(db, user.id).length;
  const memberCount = family?.memberIds.length ?? 0;

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(340)}>
          <LinearGradient
            colors={theme.name === 'dark' ? ['#2A201A', '#211915'] : ['#FFE9E1', '#FFF8F2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.hero, { borderColor: theme.border }]}
          >
            <Avatar name={user.name} color={user.avatarColor} emoji={user.avatarEmoji} size={96} online ring />
            <Text style={[styles.name, { color: theme.text }]}>{user.name}</Text>
            <View style={[styles.pill, { backgroundColor: theme.surface }]}>
              <Ionicons name="happy" size={12} color={theme.primary} />
              <Text style={[styles.pillText, { color: theme.primary }]}>{user.relationship}</Text>
            </View>
            <Text style={[styles.email, { color: theme.textMuted }]}>{maskEmail(user.email)}</Text>
            {user.bio ? <Text style={[styles.bio, { color: theme.textMuted }]}>{user.bio}</Text> : null}
            <AppButton label="Edit profile" icon="create-outline" size="sm" variant="secondary" onPress={() => navigation.navigate('EditProfile')} style={{ marginTop: 14 }} />
          </LinearGradient>
        </Animated.View>

        <View style={styles.stats}>
          <Stat icon="home" label="Family" value={family ? `${family.emoji} ${family.name.split(' ')[0]}` : 'None'} color={theme.primary} />
          <Stat icon="people" label="Members" value={String(memberCount)} color={theme.accent} />
          <Stat icon="chatbubbles" label="Chats" value={String(chatCount)} color={theme.success} />
        </View>

        <SectionHeader title="Account" />
        <LinkRow icon="person-outline" label="Edit profile" value="Name, photo, bio" onPress={() => navigation.navigate('EditProfile')} />
        <LinkRow icon="notifications-outline" label="Notifications & sound" onPress={() => navigation.navigate('Settings')} />
        <LinkRow icon="color-palette-outline" label="Appearance" value={theme.name === 'dark' ? 'Dark' : 'Light'} onPress={() => navigation.navigate('Settings')} />

        <SectionHeader title="Privacy & safety" />
        <LinkRow icon="ban-outline" label="Blocked members" value={String(user.blockedUserIds.length)} onPress={() => navigation.navigate('Blocked')} />
        <LinkRow icon="shield-checkmark-outline" label="How your data is protected" onPress={() => navigation.navigate('Settings')} />

        <Card tone="alt" style={styles.infoCard}>
          <Ionicons name="lock-closed" size={16} color={theme.success} />
          <Text style={[styles.infoText, { color: theme.textMuted }]}>
            Your messages live inside your family group only. FamilyConnect never lists families publicly, and passwords are salted + hashed before storage.
          </Text>
        </Card>

        <SectionHeader title="Session" />
        <LinkRow icon="log-out-outline" label="Sign out" tone="danger" right={null} onPress={() => setConfirmOut(true)} />

        <Text style={[styles.version, { color: theme.textFaint }]}>FamilyConnect v1.0.0 · private by design</Text>
      </ScrollView>

      <ActionSheet
        visible={confirmOut}
        title="Sign out of FamilyConnect?"
        message="Your family stays right where it is - sign back in any time."
        options={[
          {
            label: 'Sign out',
            icon: 'log-out-outline',
            tone: 'danger',
            onPress: async () => {
              await signOut();
              show('Signed out - see you soon 👋', { icon: 'log-out' });
            },
          },
        ]}
        onClose={() => setConfirmOut(false)}
      />
    </Screen>
  );
}

function Stat({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <Text numberOfLines={1} style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 120 },
  hero: { alignItems: 'center', padding: 24, borderRadius: 28, borderWidth: StyleSheet.hairlineWidth, marginTop: 8 },
  name: { fontSize: 23, fontWeight: '900', marginTop: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 12, marginTop: 8 },
  pillText: { fontSize: 12, fontWeight: '800' },
  email: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  bio: { fontSize: 13.5, textAlign: 'center', marginTop: 8, lineHeight: 19, maxWidth: 320 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 16 },
  stat: { flex: 1, alignItems: 'center', gap: 5, paddingVertical: 14, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
  statIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 14.5, fontWeight: '900', maxWidth: '90%' },
  statLabel: { fontSize: 11.5, fontWeight: '600' },
  infoCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 6 },
  infoText: { fontSize: 12.5, lineHeight: 18.5, flex: 1, fontWeight: '500' },
  version: { fontSize: 12, textAlign: 'center', marginTop: 22, fontWeight: '600' },
});
