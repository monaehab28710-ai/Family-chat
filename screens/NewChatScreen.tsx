import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Field } from '../components/Field';
import { EmptyState } from '../components/EmptyState';
import { MemberRow } from '../components/MemberRow';
import { useTheme } from '../lib/theme';
import { useApp } from '../lib/bootstrap';
import { myFamily } from '../lib/selectors';
import { formatLastSeen } from '../lib/format';
import { getOrCreateDm } from '../lib/api';
import { useToast } from '../lib/toast';
import type { RootStackParamList } from '../navigation/types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function NewChatScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Navigation>();
  const { db, user } = useApp();
  const { show } = useToast();
  const [query, setQuery] = useState('');

  const family = db && user ? myFamily(db, user.id) : null;
  const members = useMemo(() => {
    if (!db || !user || !family) return [];
    return family.memberIds
      .map((id) => db.users[id])
      .filter((u): u is NonNullable<typeof u> => Boolean(u))
      .filter((u) => u.id !== user.id && !user.blockedUserIds.includes(u.id))
      .sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));
  }, [db, user, family]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.name.toLowerCase().includes(q) || m.relationship.toLowerCase().includes(q));
  }, [members, query]);

  return (
    <Screen>
      <Header title="New message" subtitle="Private, family-only chats" onBack={() => navigation.goBack()} />
      <View style={styles.search}>
        <Field placeholder="Search your family" icon="search" value={query} onChangeText={setQuery} returnKeyType="search" containerStyle={{ flex: 1 }} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={<Text style={[styles.hint, { color: theme.textMuted }]}>Pick a relative to start a one-to-one chat</Text>}
        ListEmptyComponent={
          <EmptyState emoji="🔍" title="No one matches" message="Try another name, or invite a relative from the Family tab." />
        }
        renderItem={({ item }) => (
          <MemberRow
            user={item}
            selfId={user?.id}
            subtitle={item.online ? 'Online now' : formatLastSeen(item.lastSeenAt)}
            onPress={() => {
              try {
                const conversation = getOrCreateDm(item.id);
                navigation.replace('ChatRoom', { conversationId: conversation.id });
              } catch (error) {
                show((error as Error).message, { tone: 'error' });
              }
            }}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 14 },
  list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  hint: { fontSize: 13, fontWeight: '600', marginBottom: 12, marginLeft: 4 },
});
