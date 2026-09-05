import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '../components/Screen';
import { Avatar, AvatarStack } from '../components/Avatar';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Field } from '../components/Field';
import { SkeletonRow } from '../components/Skeleton';
import { AppButton, IconButton } from '../components/Button';
import { ActionSheet, type SheetOption } from '../components/ActionSheet';
import { useTheme } from '../lib/theme';
import { useApp } from '../lib/bootstrap';
import { conversationItems, myFamily, unreadTotal } from '../lib/selectors';
import { formatShortDate, groupCode } from '../lib/format';
import { useToast } from '../lib/toast';
import { markAllNotificationsRead } from '../lib/api';
import { useTypingUsers } from '../lib/typing';
import type { ConversationItem } from '../lib/selectors';
import type { RootStackParamList } from '../navigation/types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function ChatsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Navigation>();
  const { db, user } = useApp();
  const { show } = useToast();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 520);
    return () => clearTimeout(t);
  }, []);

  const family = db && user ? myFamily(db, user.id) : null;
  const items = useMemo(() => (db && user ? conversationItems(db, user.id) : []), [db, user]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.title.toLowerCase().includes(q) || item.preview.toLowerCase().includes(q));
  }, [items, query]);
  const unread = db && user ? unreadTotal(db, user.id) : 0;

  const sheetOptions: SheetOption[] = [
    {
      label: 'New message',
      icon: 'create-outline',
      hint: 'Start a private chat with a relative',
      onPress: () => navigation.navigate('NewChat'),
    },
    {
      label: 'Family members',
      icon: 'people-outline',
      onPress: () => navigation.navigate('Main', { screen: 'Family' } as never),
    },
    {
      label: 'Family settings',
      icon: 'settings-outline',
      onPress: () => navigation.navigate('Settings'),
    },
  ];

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: theme.textMuted }]}>Hello, {user?.name.split(' ')[0] ?? 'there'} 👋</Text>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text }]}>Chats</Text>
            {unread > 0 ? (
              <View style={[styles.unreadPill, { backgroundColor: theme.primarySoft }]}>
                <Text style={[styles.unreadPillText, { color: theme.primary }]}>{unread} new</Text>
              </View>
            ) : null}
          </View>
        </View>
        <IconButton icon="create-outline" label="New message" onPress={() => navigation.navigate('NewChat')} tone="primary" filled />
      </View>

      {family ? (
        <Pressable
          onPress={() => {
            setSheetOpen(true);
          }}
          style={({ pressed }) => [
            styles.familyBar,
            { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Family options"
        >
          <View style={[styles.familyEmoji, { backgroundColor: family.color }]}>
            <Text style={{ fontSize: 18 }}>{family.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={[styles.familyName, { color: theme.text }]}>
              {family.name}
            </Text>
            <Text style={[styles.familyMeta, { color: theme.textMuted }]}>
              {family.memberIds.length} members · code {groupCode(family.inviteCode)}
            </Text>
          </View>
          <Ionicons name="ellipsis-horizontal" size={18} color={theme.textFaint} />
        </Pressable>
      ) : null}

      <View style={styles.searchWrap}>
        <Field
          placeholder="Search conversations"
          icon="search"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          containerStyle={{ flex: 1 }}
          accessibilityLabel="Search conversations"
        />
      </View>

      {loading ? (
        <View style={styles.list}>
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.conv.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={theme.primary}
              colors={[theme.primary]}
              onRefresh={() => {
                setRefreshing(true);
                setTimeout(() => setRefreshing(false), 900);
              }}
            />
          }
          ListEmptyComponent={
            family ? (
              <EmptyState
                emoji="💬"
                title={query ? 'No matching chats' : 'No conversations yet'}
                message={
                  query
                    ? 'Try a different name or word.'
                    : 'Say hello in the family room or start a private chat with a relative.'
                }
                actionLabel={query ? undefined : 'Start a message'}
                onAction={query ? undefined : () => navigation.navigate('NewChat')}
              />
            ) : (
              <View style={styles.noFamily}>
                <EmptyState
                  emoji="🔒"
                  title="You are not in a family yet"
                  message="FamilyConnect is invite-only. Create your own private family group, or join a relative's with their code."
                  compact
                />
                <View style={styles.noFamilyActions}>
                  <AppButton label="Create a family" icon="add" onPress={() => navigation.navigate('FamilySetup')} full />
                  <AppButton label="Join with a code" icon="key-outline" variant="secondary" onPress={() => navigation.navigate('FamilySetup')} full />
                </View>
              </View>
            )
          }
          renderItem={({ item, index }) => (
            <ChatRow item={item} index={index} selfId={user?.id ?? ''} onPress={() => navigation.navigate('ChatRoom', { conversationId: item.conv.id })} />
          )}
        />
      )}

      <ActionSheet
        visible={sheetOpen}
        title={family ? family.name : 'Family'}
        message={family ? `Invitation code ${groupCode(family.inviteCode)} · invite-only` : undefined}
        options={sheetOptions}
        onClose={() => setSheetOpen(false)}
      />
    </Screen>
  );
}

function ChatRow({ item, index, selfId, onPress }: { item: ConversationItem; index: number; selfId: string; onPress: () => void }) {
  const theme = useTheme();
  const { db } = useApp();
  const typingIds = useTypingUsers(item.conv.id);
  const typingNames = typingIds
    .map((id) => db?.users[id]?.name.split(' ')[0] ?? '')
    .filter(Boolean);

  const ownLast = Boolean(item.lastMessage && item.lastMessage.senderId === selfId);
  const showSender = item.conv.type === 'group' && item.lastMessage && item.lastMessage.kind !== 'system' && db?.users[item.lastMessage.senderId];
  const senderName = item.lastMessage ? db?.users[item.lastMessage.senderId]?.name.split(' ')[0] : undefined;

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(260)}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Open chat with ${item.title}`}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: item.unread > 0 && !item.muted ? theme.primarySoft : theme.surface,
            borderColor: item.unread > 0 && !item.muted ? theme.primary : theme.border,
            opacity: pressed ? 0.88 : 1,
          },
        ]}
      >
        {item.conv.type === 'group' ? (
          item.avatarUser ? (
            <Avatar name={item.title} color={item.color} emoji={item.emoji} size={52} />
          ) : (
            <AvatarStack
              people={item.conv.memberIds
                .map((id) => db?.users[id])
                .filter((u): u is NonNullable<typeof u> => Boolean(u))
                .map((u) => ({ id: u.id, name: u.name, avatarColor: u.avatarColor, avatarEmoji: u.avatarEmoji }))}
              emoji={item.emoji}
              color={item.color}
              size={30}
              max={3}
            />
          )
        ) : (
          <Avatar name={item.title} color={item.color} size={52} online={item.other?.online} dim={item.muted} />
        )}

        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.text }]}>
              {item.title}
            </Text>
            {item.muted ? <Ionicons name="notifications-off" size={13} color={theme.textFaint} /> : null}
            <Text style={[styles.rowTime, { color: item.unread > 0 ? theme.primary : theme.textFaint }]}>
              {item.conv.lastMessageAt ? formatShortDate(item.conv.lastMessageAt) : ''}
            </Text>
          </View>
          <View style={styles.rowBottom}>
            {typingNames.length > 0 ? (
              <Text style={[styles.typing, { color: theme.primary }]} numberOfLines={1}>
                {typingNames.join(', ')} {typingNames.length > 1 ? 'are' : 'is'} typing…
              </Text>
            ) : (
              <Text numberOfLines={1} style={[styles.preview, { color: item.unread > 0 ? theme.text : theme.textMuted }]}>
                {ownLast ? <Ionicons name="checkmark-done" size={13} color={item.lastMessage?.status === 'read' ? theme.primary : theme.textFaint} /> : null}
                {showSender ? `${senderName}: ` : ''}
                {item.preview}
              </Text>
            )}
            {item.unread > 0 ? (
              <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                <Text style={styles.badgeText}>{item.unread > 99 ? '99+' : item.unread}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  greeting: { fontSize: 13, fontWeight: '700' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: 0.2 },
  unreadPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  unreadPillText: { fontSize: 11, fontWeight: '800' },
  familyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  familyEmoji: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  familyName: { fontSize: 15, fontWeight: '800' },
  familyMeta: { fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  searchWrap: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 14, marginBottom: 4 },
  list: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 110, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 12,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  rowBody: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle: { fontSize: 15.5, fontWeight: '800', flexShrink: 1 },
  rowTime: { fontSize: 11.5, fontWeight: '700', marginLeft: 'auto' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  preview: { flex: 1, fontSize: 13.5, fontWeight: '500', lineHeight: 18 },
  typing: { flex: 1, fontSize: 13.5, fontWeight: '700' },
  badge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  noFamily: { alignItems: 'center' },
  noFamilyActions: { width: '100%', maxWidth: 360, gap: 10, paddingHorizontal: 12 },
});
