import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Field } from '../components/Field';
import { Chip } from '../components/Chip';
import { AppButton, IconButton } from '../components/Button';
import { MemberRow } from '../components/MemberRow';
import { SectionHeader } from '../components/SectionHeader';
import { ActionSheet, type SheetOption } from '../components/ActionSheet';
import { useTheme } from '../lib/theme';
import { useApp } from '../lib/bootstrap';
import { conversationItems, familyMembers, myFamily } from '../lib/selectors';
import { groupCode } from '../lib/format';
import { useToast } from '../lib/toast';
import { copyText } from '../lib/clipboard';
import {
  createGroup,
  getOrCreateDm,
  leaveFamily,
  regenerateInviteCode,
  removeFamilyMember,
  setFamilyAdmin,
  updateFamilySettings,
} from '../lib/api';
import { AVATAR_COLORS, GROUP_EMOJIS } from '../lib/seed';
import type { UserRecord } from '../lib/types';
import type { RootStackParamList } from '../navigation/types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function FamilyScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Navigation>();
  const { db, user } = useApp();
  const { show } = useToast();

  const family = db && user ? myFamily(db, user.id) : null;
  const members = useMemo(() => (db && family ? familyMembers(db, family.id) : []), [db, family]);
  const items = useMemo(() => (db && user ? conversationItems(db, user.id) : []), [db, user]);
  const familyRoom = items.find((item) => item.conv.isFamilyRoom);
  const groups = items.filter((item) => item.conv.type === 'group' && !item.conv.isFamilyRoom);

  const [groupOpen, setGroupOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [memberSheet, setMemberSheet] = useState<UserRecord | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupEmoji, setGroupEmoji] = useState(GROUP_EMOJIS[0]);
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('🏡');
  const [editColor, setEditColor] = useState(AVATAR_COLORS[0]);

  if (!db || !user || !family) {
    return (
      <Screen edges={['top']}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.text }]}>Family</Text>
        </View>
        <EmptyState
          emoji="🔒"
          title="No family yet"
          message="Create a private family group or join a relative with their invitation code."
          actionLabel="Set up my family"
          onAction={() => navigation.navigate('FamilySetup')}
        />
      </Screen>
    );
  }

  const isAdmin = family.adminUserIds.includes(user.id);

  const memberOptions = (member: UserRecord): SheetOption[] => {
    const isSelf = member.id === user.id;
    const isMemberAdmin = family.adminUserIds.includes(member.id);
    return [
      ...(!isSelf
        ? [
            {
              label: 'Message',
              icon: 'chatbubble-outline' as const,
              onPress: () => {
                try {
                  const conversation = getOrCreateDm(member.id);
                  navigation.navigate('ChatRoom', { conversationId: conversation.id });
                } catch (error) {
                  show((error as Error).message, { tone: 'error' });
                }
              },
            },
          ]
        : []),
      {
        label: 'View profile',
        icon: 'person-outline',
        onPress: () => navigation.navigate('MemberDetail', { userId: member.id }),
      },
      ...(isAdmin && !isSelf
        ? [
            {
              label: isMemberAdmin ? 'Remove admin rights' : 'Make group admin',
              icon: 'shield-outline',
              onPress: () => {
                setFamilyAdmin(family.id, member.id, !isMemberAdmin);
                show(isMemberAdmin ? `${member.name.split(' ')[0]} is no longer an admin` : `${member.name.split(' ')[0]} is now an admin`, { icon: 'shield-checkmark' });
              },
            },
            {
              label: 'Remove from family',
              icon: 'person-remove-outline',
              tone: 'danger' as const,
              onPress: () => {
                removeFamilyMember(family.id, member.id);
                show(`${member.name} was removed from the family`, { icon: 'person-remove' });
              },
            },
          ]
        : []),
    ];
  };

  const shareInvite = async () => {
    const message = `Join our private family group "${family.name}" on FamilyConnect. Invitation code: ${groupCode(family.inviteCode)} (only people with this code can join)`;
    try {
      await Share.share({ message });
    } catch {
      // user dismissed
    }
  };

  const submitGroup = () => {
    if (groupName.trim().length < 2) {
      show('Give the group a name (2 characters or more).', { tone: 'error' });
      return;
    }
    try {
      const conversation = createGroup({
        familyId: family.id,
        name: groupName,
        emoji: groupEmoji,
        memberIds: groupMembers,
      });
      setGroupOpen(false);
      setGroupName('');
      setGroupMembers([]);
      setGroupEmoji(GROUP_EMOJIS[0]);
      show('Private group created 🎉', { tone: 'success' });
      navigation.navigate('ChatRoom', { conversationId: conversation.id });
    } catch (error) {
      show((error as Error).message, { tone: 'error' });
    }
  };

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(360)} style={styles.coverWrap}>
          <Image source={require('../assets/images/family-cover.png')} style={styles.cover} contentFit="cover" transition={220} />
          <LinearGradient colors={['transparent', 'rgba(20,10,6,0.72)']} style={StyleSheet.absoluteFill} />
          <View style={styles.coverContent}>
            <View style={[styles.coverEmoji, { backgroundColor: family.color }]}>
              <Text style={{ fontSize: 24 }}>{family.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={styles.coverTitle}>{family.name}</Text>
              <Text style={styles.coverMeta}>{family.memberIds.length} members · created {new Date(family.createdAt).getFullYear()}</Text>
            </View>
            {isAdmin ? (
              <IconButton
                icon="create-outline"
                label="Edit family"
                onPress={() => {
                  setEditName(family.name);
                  setEditEmoji(family.emoji);
                  setEditColor(family.color);
                  setEditOpen(true);
                }}
              />
            ) : null}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(360)}>
          <Card style={styles.inviteCard}>
            <View style={styles.inviteTop}>
              <View style={[styles.inviteIcon, { backgroundColor: theme.primarySoft }]}>
                <Ionicons name="key" size={18} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inviteTitle, { color: theme.text }]}>Invitation code</Text>
                <Text style={[styles.inviteHint, { color: theme.textMuted }]}>Invite-only · never searchable</Text>
              </View>
            </View>
            <View style={[styles.codeBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
              <Text style={[styles.code, { color: theme.text }]}>{groupCode(family.inviteCode)}</Text>
            </View>
            <View style={styles.inviteActions}>
              <AppButton
                label="Copy code"
                icon="copy-outline"
                variant="secondary"
                size="sm"
                onPress={async () => {
                  const result = await copyText(family.inviteCode);
                  show(result === 'failed' ? 'Could not copy the code' : 'Invitation code copied', { tone: result === 'failed' ? 'error' : 'success', icon: 'copy' });
                }}
                style={{ flex: 1 }}
              />
              <AppButton label="Share invite" icon="share-outline" size="sm" onPress={shareInvite} style={{ flex: 1 }} />
            </View>
            {isAdmin ? (
              <Pressable
                onPress={() => {
                  const code = regenerateInviteCode(family.id);
                  show(`New code generated: ${groupCode(code)} - old links no longer work`, { icon: 'refresh' });
                }}
                style={styles.regen}
                accessibilityRole="button"
                accessibility-label="Generate a new invitation code"
              >
                <Ionicons name="refresh" size={13} color={theme.textMuted} />
                <Text style={[styles.regenText, { color: theme.textMuted }]}>Regenerate code</Text>
              </Pressable>
            ) : null}
          </Card>
        </Animated.View>

        {familyRoom ? (
          <Pressable
            onPress={() => navigation.navigate('ChatRoom', { conversationId: familyRoom.conv.id })}
            style={({ pressed }) => [
              styles.roomCard,
              { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.88 : 1 },
            ]}
            accessibilityRole="button"
            accessibility-label="Open the family room"
          >
            <View style={[styles.roomEmoji, { backgroundColor: family.color }]}>
              <Text style={{ fontSize: 22 }}>{familyRoom.conv.emoji ?? '🏡'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.roomTitle, { color: theme.text }]}>Family room</Text>
              <Text numberOfLines={1} style={[styles.roomPreview, { color: theme.textMuted }]}>
                {familyRoom.preview}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textFaint} />
          </Pressable>
        ) : null}

        <SectionHeader title="Private groups" actionLabel="New group" actionIcon="add" onAction={() => setGroupOpen(true)} />
        {groups.length === 0 ? (
          <Card tone="alt" style={styles.emptyGroup}>
            <Text style={[styles.emptyGroupText, { color: theme.textMuted }]}>
              Plan a trip, a dinner or a surprise - create a small private group with the relatives you need.
            </Text>
          </Card>
        ) : (
          groups.map((item) => (
            <Pressable
              key={item.conv.id}
              onPress={() => navigation.navigate('ChatRoom', { conversationId: item.conv.id })}
              style={({ pressed }) => [styles.groupRow, { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.88 : 1 }]}
            >
              <View style={[styles.groupEmoji, { backgroundColor: item.color }]}>
                <Text style={{ fontSize: 18 }}>{item.emoji ?? '🎉'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={[styles.groupTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.groupMeta, { color: theme.textMuted }]}>{item.conv.memberIds.length} members</Text>
              </View>
              {item.unread > 0 ? (
                <View style={[styles.groupBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.groupBadgeText}>{item.unread}</Text>
                </View>
              ) : null}
            </Pressable>
          ))
        )}

        <SectionHeader title={`Family members (${members.length})`} />
        {members.map((member) => (
          <MemberRow
            key={member.id}
            user={member}
            selfId={user.id}
            badge={family.adminUserIds.includes(member.id) ? 'ADMIN' : null}
            subtitle={member.online ? 'Online now' : member.relationship}
            onPress={() => setMemberSheet(member)}
          />
        ))}

        <View style={styles.dangerZone}>
          <AppButton
            label="Leave this family"
            icon="exit-outline"
            variant="outline"
            full
            onPress={() => {
              leaveFamily(family.id);
              show('You left the family group', { icon: 'exit' });
            }}
          />
          <Text style={[styles.dangerHint, { color: theme.textFaint }]}>
            You will lose access to every conversation in {family.name}. A new invitation is required to return.
          </Text>
        </View>
      </ScrollView>

      <ActionSheet
        visible={Boolean(memberSheet)}
        title={memberSheet?.name}
        message={memberSheet ? `${memberSheet.relationship} · ${memberSheet.online ? 'online now' : 'offline'}` : undefined}
        options={memberSheet ? memberOptions(memberSheet) : []}
        onClose={() => setMemberSheet(null)}
      />

      {/* Create private group */}
      <Modal visible={groupOpen} transparent animationType="fade" onRequestClose={() => setGroupOpen(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setGroupOpen(false)} accessibilityLabel="Close" />
          <Animated.View entering={FadeInUp.springify().damping(20)} style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>New private group</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>Only the relatives you pick can see it.</Text>
            <Field label="Group name" placeholder="e.g. Summer trip 🏖️" value={groupName} onChangeText={setGroupName} maxLength={40} autoCapitalize="words" />
            <View>
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>ICON</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {GROUP_EMOJIS.map((emoji) => (
                  <Chip key={emoji} label={emoji} size="sm" selected={groupEmoji === emoji} onPress={() => setGroupEmoji(emoji)} />
                ))}
              </ScrollView>
            </View>
            <View>
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>MEMBERS</Text>
              <View style={styles.chipRow}>
                {members
                  .filter((m) => m.id !== user.id)
                  .map((member) => (
                    <Chip
                      key={member.id}
                      label={member.name.split(' ')[0]}
                      size="sm"
                      selected={groupMembers.includes(member.id)}
                      onPress={() =>
                        setGroupMembers((current) =>
                          current.includes(member.id) ? current.filter((id) => id !== member.id) : [...current, member.id]
                        )
                      }
                    />
                  ))}
              </View>
            </View>
            <View style={styles.modalActions}>
              <AppButton label="Cancel" variant="ghost" size="sm" onPress={() => setGroupOpen(false)} />
              <AppButton label="Create group" onPress={submitGroup} size="sm" />
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Edit family settings */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditOpen(false)} accessibilityLabel="Close" />
          <Animated.View entering={FadeInUp.springify().damping(20)} style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Family settings</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>Visible to every member of {family.name}.</Text>
            <Field label="Family name" placeholder="Family name" value={editName} onChangeText={setEditName} maxLength={40} autoCapitalize="words" />
            <View>
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>ICON</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {['🏡', '💛', '🌻', '🏕️', '☕️', '🎄', '🍕', '🐾', '🌊', '🎉'].map((emoji) => (
                  <Chip key={emoji} label={emoji} size="sm" selected={editEmoji === emoji} onPress={() => setEditEmoji(emoji)} />
                ))}
              </ScrollView>
            </View>
            <View>
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>COLOR</Text>
              <View style={styles.chipRow}>
                {AVATAR_COLORS.slice(0, 8).map((color) => (
                  <Pressable
                    key={color}
                    onPress={() => setEditColor(color)}
                    style={[styles.colorDot, { backgroundColor: color, borderColor: editColor === color ? theme.text : 'transparent' }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Color ${color}`}
                  />
                ))}
              </View>
            </View>
            <View style={styles.modalActions}>
              <AppButton label="Cancel" variant="ghost" size="sm" onPress={() => setEditOpen(false)} />
              <AppButton
                label="Save changes"
                size="sm"
                onPress={() => {
                  try {
                    updateFamilySettings(family.id, { name: editName, emoji: editEmoji, color: editColor });
                    setEditOpen(false);
                    show('Family settings saved', { tone: 'success' });
                  } catch (error) {
                    show((error as Error).message, { tone: 'error' });
                  }
                }}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 120 },
  headerRow: { paddingHorizontal: 20, paddingTop: 10 },
  title: { fontSize: 28, fontWeight: '900' },
  coverWrap: { height: 168, borderRadius: 26, overflow: 'hidden', justifyContent: 'flex-end' },
  cover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  coverContent: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  coverEmoji: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  coverTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: '900' },
  coverMeta: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, fontWeight: '600', marginTop: 3 },
  inviteCard: { marginTop: 16, gap: 14 },
  inviteTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inviteIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  inviteTitle: { fontSize: 15.5, fontWeight: '800' },
  inviteHint: { fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  codeBox: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 14, alignItems: 'center' },
  code: { fontSize: 26, fontWeight: '900', letterSpacing: 6 },
  inviteActions: { flexDirection: 'row', gap: 10 },
  regen: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 2 },
  regenText: { fontSize: 12.5, fontWeight: '700' },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 14,
  },
  roomEmoji: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  roomTitle: { fontSize: 15.5, fontWeight: '800' },
  roomPreview: { fontSize: 13, marginTop: 3, fontWeight: '500' },
  emptyGroup: { padding: 16 },
  emptyGroupText: { fontSize: 13.5, lineHeight: 20, fontWeight: '500' },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  groupEmoji: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  groupTitle: { fontSize: 15, fontWeight: '800' },
  groupMeta: { fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  groupBadge: { minWidth: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  groupBadgeText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '800' },
  dangerZone: { marginTop: 26, gap: 10 },
  dangerHint: { fontSize: 12, textAlign: 'center', lineHeight: 17, paddingHorizontal: 12 },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 18 },
  modalCard: { borderRadius: 26, borderWidth: StyleSheet.hairlineWidth, padding: 20, gap: 14, maxWidth: 520, width: '100%', alignSelf: 'center' },
  modalTitle: { fontSize: 19, fontWeight: '900' },
  modalSubtitle: { fontSize: 13, marginTop: -8, lineHeight: 18 },
  fieldLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  colorDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
});
