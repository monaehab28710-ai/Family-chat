import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Avatar } from '../components/Avatar';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { AppButton } from '../components/Button';
import { ActionSheet, type SheetOption } from '../components/ActionSheet';
import { useTheme } from '../lib/theme';
import { useApp } from '../lib/bootstrap';
import { familyMembers, myFamily } from '../lib/selectors';
import { formatLastSeen } from '../lib/format';
import { useToast } from '../lib/toast';
import { blockUser, getOrCreateDm, removeFamilyMember, reportUser, setFamilyAdmin, unblockUser } from '../lib/api';
import type { RootStackParamList } from '../navigation/types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'MemberDetail'>;

const REPORT_REASONS = ['Harassment or bullying', 'Inappropriate content', 'Spam or scams', 'Something else'];

export function MemberDetailScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { db, user } = useApp();
  const { show } = useToast();
  const [reportOpen, setReportOpen] = useState(false);

  const member = db?.users[route.params.userId] ?? null;
  const family = db && user ? myFamily(db, user.id) : null;

  if (!db || !user || !member || !family) {
    return (
      <Screen>
        <Header title="Profile" onBack={() => navigation.goBack()} />
        <EmptyState emoji="person" icon="person-outline" title="Profile unavailable" message="This member is no longer in your family." actionLabel="Go back" onAction={() => navigation.goBack()} />
      </Screen>
    );
  }

  const isSelf = member.id === user.id;
  const isBlocked = user.blockedUserIds.includes(member.id);
  const isMemberAdmin = family.adminUserIds.includes(member.id);
  const iAmAdmin = family.adminUserIds.includes(user.id);
  const sharedGroups = Object.values(db.conversations).filter(
    (c) => c.type === 'group' && c.memberIds.includes(user.id) && c.memberIds.includes(member.id)
  ).length;
  const relationshipIcon = (member.relationship.toLowerCase().includes('mother') || member.relationship.toLowerCase().includes('father')
    ? 'heart'
    : 'happy') as keyof typeof Ionicons.glyphMap;

  const reportOptions: SheetOption[] = REPORT_REASONS.map((reason) => ({
    label: reason,
    icon: 'flag-outline',
    onPress: () => {
      reportUser(member.id, reason, `Reported from member profile`);
      show('Thanks - our family safety team will review this.', { icon: 'shield-checkmark' });
    },
  }));

  return (
    <Screen>
      <Header title={isSelf ? 'Your profile' : 'Member profile'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(340)} style={styles.hero}>
          <Avatar name={member.name} color={member.avatarColor} emoji={member.avatarEmoji} size={104} online={member.online} ring />
          <Text style={[styles.name, { color: theme.text }]}>{member.name}</Text>
          <View style={[styles.relationshipPill, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name={relationshipIcon} size={12} color={theme.primary} />
            <Text style={[styles.relationshipText, { color: theme.primary }]}>{member.relationship}</Text>
            {isMemberAdmin ? (
              <View style={[styles.adminPill, { backgroundColor: theme.accent }]}>
                <Ionicons name="shield-checkmark" size={10} color="#FFFFFF" />
                <Text style={styles.adminText}>ADMIN</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.status, { color: member.online ? theme.success : theme.textMuted }]}>
            {member.online ? 'Online now' : formatLastSeen(member.lastSeenAt)}
          </Text>
          {member.bio ? <Text style={[styles.bio, { color: theme.textMuted }]}>{member.bio}</Text> : null}
          {isBlocked ? (
            <View style={[styles.blockedBanner, { backgroundColor: theme.name === 'dark' ? '#3A1E20' : '#FDECEC', borderColor: theme.danger }]}>
              <Ionicons name="ban" size={14} color={theme.danger} />
              <Text style={[styles.blockedText, { color: theme.danger }]}>You blocked this member</Text>
            </View>
          ) : null}
        </Animated.View>

        <View style={styles.stats}>
          <Stat label="Shared groups" value={String(sharedGroups)} icon="people" color={theme.primary} />
          <Stat label="Family" value={family.emoji} icon="home" color={theme.accent} />
          <Stat label="Since" value={String(new Date(member.createdAt).getFullYear())} icon="calendar" color={theme.success} />
        </View>

        <View style={styles.actions}>
          {!isSelf ? (
            <AppButton
              label={isBlocked ? 'Unblock member' : 'Message'}
              icon={isBlocked ? 'lock-open-outline' : 'chatbubble-outline'}
              full
              size="lg"
              onPress={() => {
                if (isBlocked) {
                  unblockUser(member.id);
                  show(`${member.name.split(' ')[0]} can message you again`, { tone: 'success' });
                  return;
                }
                try {
                  const conversation = getOrCreateDm(member.id);
                  navigation.navigate('ChatRoom', { conversationId: conversation.id });
                } catch (error) {
                  show((error as Error).message, { tone: 'error' });
                }
              }}
            />
          ) : (
            <AppButton label="Edit profile" icon="create-outline" full size="lg" onPress={() => navigation.navigate('EditProfile')} />
          )}

          {!isSelf ? (
            <View style={styles.secondaryRow}>
              <AppButton
                label={isBlocked ? 'Unblock' : 'Block'}
                icon={isBlocked ? 'lock-open-outline' : 'ban-outline'}
                variant="outline"
                size="sm"
                style={{ flex: 1 }}
                onPress={() => {
                  if (isBlocked) {
                    unblockUser(member.id);
                    show(`${member.name.split(' ')[0]} unblocked`, { tone: 'success' });
                  } else {
                    blockUser(member.id);
                    show(`${member.name.split(' ')[0]} can no longer reach you`, { icon: 'shield-checkmark' });
                  }
                }}
              />
              <AppButton label="Report" icon="flag-outline" variant="outline" size="sm" style={{ flex: 1 }} onPress={() => setReportOpen(true)} />
            </View>
          ) : null}

          {iAmAdmin && !isSelf ? (
            <Card style={styles.adminCard}>
              <Text style={[styles.adminTitle, { color: theme.text }]}>Admin controls</Text>
              <Text style={[styles.adminHint, { color: theme.textMuted }]}>
                Only family admins can manage membership. You are an admin of {family.name}.
              </Text>
              <View style={styles.adminActions}>
                <AppButton
                  label={isMemberAdmin ? 'Remove admin' : 'Make admin'}
                  icon="shield-outline"
                  variant="secondary"
                  size="sm"
                  style={{ flex: 1 }}
                  onPress={() => {
                    setFamilyAdmin(family.id, member.id, !isMemberAdmin);
                    show(isMemberAdmin ? 'Admin rights removed' : `${member.name.split(' ')[0]} is now an admin`, { icon: 'shield-checkmark' });
                  }}
                />
                <AppButton
                  label="Remove from family"
                  icon="person-remove-outline"
                  variant="outline"
                  size="sm"
                  style={{ flex: 1 }}
                  onPress={() => {
                    removeFamilyMember(family.id, member.id);
                    show(`${member.name} was removed`, { icon: 'person-remove' });
                    navigation.goBack();
                  }}
                />
              </View>
            </Card>
          ) : null}
        </View>
      </ScrollView>

      <ActionSheet
        visible={reportOpen}
        title={`Report ${member.name.split(' ')[0]}`}
        message="Reports are private and only seen by family admins and our safety team."
        options={reportOptions}
        onClose={() => setReportOpen(false)}
      />
    </Screen>
  );
}

function Stat({ label, value, icon, color }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; color: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  hero: { alignItems: 'center', paddingTop: 18, gap: 8 },
  name: { fontSize: 23, fontWeight: '900', marginTop: 8 },
  relationshipPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  relationshipText: { fontSize: 12.5, fontWeight: '800' },
  adminPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, marginLeft: 4 },
  adminText: { color: '#FFFFFF', fontSize: 9.5, fontWeight: '900' },
  status: { fontSize: 13, fontWeight: '700' },
  bio: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 4, maxWidth: 340 },
  blockedBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginTop: 10 },
  blockedText: { fontSize: 12.5, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: 10, marginTop: 24 },
  stat: { flex: 1, alignItems: 'center', gap: 5, paddingVertical: 14, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
  statIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 16, fontWeight: '900' },
  statLabel: { fontSize: 11.5, fontWeight: '600' },
  actions: { marginTop: 24, gap: 12 },
  secondaryRow: { flexDirection: 'row', gap: 10 },
  adminCard: { marginTop: 8, gap: 8 },
  adminTitle: { fontSize: 15.5, fontWeight: '800' },
  adminHint: { fontSize: 12.5, lineHeight: 18 },
  adminActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
});
