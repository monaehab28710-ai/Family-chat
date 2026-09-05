import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { MemberRow } from '../components/MemberRow';
import { AppButton } from '../components/Button';
import { useTheme } from '../lib/theme';
import { useApp } from '../lib/bootstrap';
import { unblockUser } from '../lib/api';
import { useToast } from '../lib/toast';
import type { RootStackParamList } from '../navigation/types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function BlockedScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Navigation>();
  const { db, user } = useApp();
  const { show } = useToast();

  const blocked = React.useMemo(() => {
    if (!db || !user) return [];
    return user.blockedUserIds.map((id) => db.users[id]).filter((u): u is NonNullable<typeof u> => Boolean(u));
  }, [db, user]);

  return (
    <Screen>
      <Header title="Blocked members" onBack={() => navigation.goBack()} />
      <View style={styles.intro}>
        <Ionicons name="ban" size={16} color={theme.danger} />
        <Text style={[styles.introText, { color: theme.textMuted }]}>
          Blocked members cannot start new chats with you, and their messages will not reach your notifications.
        </Text>
      </View>
      <FlatList
        data={blocked}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            emoji="🕊️"
            title="No one is blocked"
            message="If a member ever makes you uncomfortable you can block them from their profile or from any chat."
          />
        }
        renderItem={({ item }) => (
          <MemberRow
            user={item}
            dim
            subtitle={item.relationship}
            onPress={() => undefined}
            right={
              <AppButton
                label="Unblock"
                size="sm"
                variant="secondary"
                onPress={() => {
                  unblockUser(item.id);
                  show(`${item.name.split(' ')[0]} unblocked`, { tone: 'success' });
                }}
              />
            }
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 14 },
  introText: { fontSize: 12.5, lineHeight: 18, flex: 1, fontWeight: '500' },
  list: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, flexGrow: 1 },
});
