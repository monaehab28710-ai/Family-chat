import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '../components/Screen';
import { EmptyState } from '../components/EmptyState';
import { Card } from '../components/Card';
import { AppButton } from '../components/Button';
import { useTheme } from '../lib/theme';
import { useApp } from '../lib/bootstrap';
import { notificationsFor } from '../lib/selectors';
import { formatDayLabel, formatRelative } from '../lib/format';
import { useToast } from '../lib/toast';
import { clearNotifications, markAllNotificationsRead, markNotificationRead, updateSettings } from '../lib/api';
import type { AppNotificationRecord } from '../lib/types';
import type { RootStackParamList } from '../navigation/types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type Row = { type: 'day' | 'item'; id: string; label?: string; item?: AppNotificationRecord };

export function NotificationsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Navigation>();
  const { db, user } = useApp();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 420);
    return () => clearTimeout(t);
  }, []);

  const notifications = useMemo(() => (db && user ? notificationsFor(db, user.id) : []), [db, user]);
  const unread = notifications.filter((n) => !n.read).length;
  const pushEnabled = user?.settings.notificationsEnabled ?? true;

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let lastDay = '';
    notifications.forEach((item) => {
      const day = formatDayLabel(item.createdAt);
      if (day !== lastDay) {
        out.push({ type: 'day', id: `day-${item.id}`, label: day });
        lastDay = day;
      }
      out.push({ type: 'item', id: item.id, item });
    });
    return out;
  }, [notifications]);

  const open = (item: AppNotificationRecord) => {
    markNotificationRead(item.id);
    if (item.conversationId && db?.conversations[item.conversationId]) {
      navigation.navigate('ChatRoom', { conversationId: item.conversationId });
    } else if (item.familyId) {
      navigation.navigate('Main', { screen: 'Family' } as never);
    }
  };

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>Notifications</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {unread > 0 ? `${unread} unread update${unread > 1 ? 's' : ''}` : 'You are all caught up'}
          </Text>
        </View>
        {notifications.length > 0 ? (
          <Pressable
            onPress={() => {
              markAllNotificationsRead();
              show('All notifications marked as read', { icon: 'checkmark-done' });
            }}
            hitSlop={10}
            style={[styles.headerBtn, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
            accessibilityRole="button"
            accessibilityLabel="Mark all as read"
          >
            <Ionicons name="checkmark-done" size={18} color={theme.primary} />
          </Pressable>
        ) : null}
      </View>

      {!pushEnabled ? (
        <Card tone="primary" style={styles.banner}>
          <Ionicons name="notifications-off" size={18} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: theme.text }]}>Push notifications are off</Text>
            <Text style={[styles.bannerText, { color: theme.textMuted }]}>
              Turn them on so you never miss a message from the family.
            </Text>
          </View>
          <AppButton
            label="Turn on"
            size="sm"
            onPress={() => {
              updateSettings({ notificationsEnabled: true });
              show('Push notifications enabled', { tone: 'success', icon: 'notifications' });
            }}
          />
        </Card>
      ) : null}

      <FlatList
        data={loading ? [] : rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              emoji="🔔"
              title="Nothing here yet"
              message="New messages, family invites and member updates will show up here."
            />
          )
        }
        renderItem={({ item, index }) => {
          if (item.type === 'day') {
            return <Text style={[styles.dayLabel, { color: theme.textFaint }]}>{item.label}</Text>;
          }
          const notification = item.item!;
          return (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 35).duration(240)}>
              <Pressable
                onPress={() => open(notification)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: notification.read ? theme.surface : theme.primarySoft,
                    borderColor: notification.read ? theme.border : theme.primary,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${notification.title}: ${notification.body}`}
              >
                <View style={[styles.emojiBadge, { backgroundColor: theme.surface }]}>
                  <Text style={{ fontSize: 18 }}>{notification.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowTop}>
                    <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.text }]}>{notification.title}</Text>
                    <Text style={[styles.rowTime, { color: theme.textFaint }]}>{formatRelative(notification.createdAt)}</Text>
                  </View>
                  <Text numberOfLines={2} style={[styles.rowBody, { color: theme.textMuted }]}>{notification.body}</Text>
                </View>
                {!notification.read ? <View style={[styles.dot, { backgroundColor: theme.primary }]} /> : null}
              </Pressable>
            </Animated.View>
          );
        }}
      />

      {notifications.length > 0 && !loading ? (
        <Pressable
          onPress={() => {
            clearNotifications();
            show('Notification history cleared', { icon: 'trash' });
          }}
          style={styles.clear}
          accessibilityRole="button"
          accessibilityLabel="Clear notification history"
        >
          <Ionicons name="trash-outline" size={14} color={theme.textFaint} />
          <Text style={[styles.clearText, { color: theme.textFaint }]}>Clear notification history</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, gap: 12 },
  title: { fontSize: 28, fontWeight: '900' },
  subtitle: { fontSize: 13, fontWeight: '600', marginTop: 3 },
  headerBtn: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginTop: 14 },
  bannerTitle: { fontSize: 14.5, fontWeight: '800' },
  bannerText: { fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  list: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 110, flexGrow: 1 },
  dayLabel: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.9, marginBottom: 10, marginTop: 8, marginLeft: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  emojiBadge: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { fontSize: 14.5, fontWeight: '800', flex: 1 },
  rowTime: { fontSize: 11.5, fontWeight: '700' },
  rowBody: { fontSize: 13, marginTop: 3, lineHeight: 18, fontWeight: '500' },
  dot: { width: 9, height: 9, borderRadius: 5 },
  clear: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 96, paddingTop: 4 },
  clearText: { fontSize: 12.5, fontWeight: '700' },
});
