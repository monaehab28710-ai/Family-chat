import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { LinkRow, SwitchRow } from '../components/Rows';
import { SectionHeader } from '../components/SectionHeader';
import { ActionSheet } from '../components/ActionSheet';
import { useTheme } from '../lib/theme';
import { useApp } from '../lib/bootstrap';
import { useToast } from '../lib/toast';
import { resetDatabase } from '../lib/store';
import { signOut, updateSettings } from '../lib/api';
import type { ThemePreference } from '../lib/types';
import type { RootStackParamList } from '../navigation/types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

const THEME_OPTIONS: { key: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
];
export function SettingsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Navigation>();
  const { user, setThemePreference } = useApp();
  const { show } = useToast();
  const [confirmOut, setConfirmOut] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const settings = user?.settings;

  return (
    <Screen>
      <Header title="Settings" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(320)}>
          <SectionHeader title="Appearance" />
          <View style={styles.segment}>
            {THEME_OPTIONS.map((option) => {
              const active = (settings?.theme ?? 'system') === option.key;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => {
                    setThemePreference(option.key);
                    show(`Switched to ${option.label.toLowerCase()} mode`, { icon: option.icon as string });
                  }}
                  style={[
                    styles.segmentItem,
                    {
                      backgroundColor: active ? theme.primary : theme.surface,
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${option.label} mode`}
                >
                  <Ionicons name={option.icon} size={17} color={active ? '#FFFFFF' : theme.textMuted} />
                  <Text style={[styles.segmentText, { color: active ? '#FFFFFF' : theme.text }]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <SectionHeader title="Notifications" />
          <SwitchRow
            icon="notifications-outline"
            label="Push notifications"
            description="Get alerted for direct and group messages"
            value={settings?.notificationsEnabled ?? true}
            onValueChange={(value) => {
              updateSettings({ notificationsEnabled: value });
              show(value ? 'Push notifications enabled' : 'Push notifications disabled', { icon: value ? 'notifications' : 'notifications-off' });
            }}
          />
          <SwitchRow
            icon="volume-high-outline"
            label="Message sounds"
            description="Play a sound for incoming messages"
            value={settings?.soundEnabled ?? true}
            onValueChange={(value) => updateSettings({ soundEnabled: value })}
          />
          <SwitchRow
            icon="eye-outline"
            label="Show message preview"
            description="Include message text in notification banners"
            value={settings?.previewTextEnabled ?? true}
            onValueChange={(value) => updateSettings({ previewTextEnabled: value })}
          />

          <SectionHeader title="Privacy & safety" />
          <Card tone="alt" style={styles.infoCard}>
            <Ionicons name="shield-checkmark" size={18} color={theme.success} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: theme.text }]}>Invite-only by design</Text>
              <Text style={[styles.infoText, { color: theme.textMuted }]}>
                Families cannot be searched or discovered. Access requires an 8-character invitation code issued by a family admin, and every read/write is checked against family membership.
              </Text>
            </View>
          </Card>
          <LinkRow icon="ban-outline" label="Blocked members" value={String(user?.blockedUserIds.length ?? 0)} onPress={() => navigation.navigate('Blocked')} />
          <LinkRow icon="flag-outline" label="Report a concern" onPress={() => show('Reports are reviewed by family safety - use Report on any profile or message.', { icon: 'shield-checkmark' })} />

          <SectionHeader title="Data" />
          <LinkRow
            icon="refresh-outline"
            label="Reset demo data"
            description="Restores the sample family on this device"
            onPress={() => setConfirmReset(true)}
          />
          <LinkRow icon="log-out-outline" label="Sign out" tone="danger" right={null} onPress={() => setConfirmOut(true)} />

          <View style={styles.about}>
            <View style={[styles.aboutLogo, { backgroundColor: theme.primarySoft }]}>
              <Text style={{ fontSize: 22 }}>🏠</Text>
            </View>
            <Text style={[styles.aboutTitle, { color: theme.text }]}>FamilyConnect</Text>
            <Text style={[styles.aboutText, { color: theme.textFaint }]}>Version 1.0.0 · Made for families 💛</Text>
          </View>
        </Animated.View>
      </ScrollView>

      <ActionSheet
        visible={confirmOut}
        title="Sign out?"
        message="You will need your email and password to sign back in."
        options={[
          {
            label: 'Sign out',
            icon: 'log-out-outline',
            tone: 'danger',
            onPress: async () => {
              await signOut();
              show('Signed out', { icon: 'log-out' });
            },
          },
        ]}
        onClose={() => setConfirmOut(false)}
      />

      <ActionSheet
        visible={confirmReset}
        title="Reset demo data?"
        message="This clears the local database on this device and restores the sample Rivera family."
        options={[
          {
            label: 'Reset everything',
            icon: 'refresh-outline',
            tone: 'danger',
            onPress: async () => {
              await resetDatabase();
              await signOut();
              show('Local data reset', { icon: 'refresh' });
            },
          },
        ]}
        onClose={() => setConfirmReset(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  segment: { flexDirection: 'row', gap: 8 },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segmentText: { fontSize: 13.5, fontWeight: '800' },
  infoCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 14 },
  infoTitle: { fontSize: 14.5, fontWeight: '800' },
  infoText: { fontSize: 12.5, lineHeight: 18.5, marginTop: 4, fontWeight: '500' },
  about: { alignItems: 'center', marginTop: 32, gap: 6 },
  aboutLogo: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  aboutTitle: { fontSize: 15.5, fontWeight: '900', marginTop: 6 },
  aboutText: { fontSize: 12.5, fontWeight: '600' },
});
