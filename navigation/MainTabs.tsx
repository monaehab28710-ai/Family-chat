import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../lib/theme';
import { useApp } from '../lib/bootstrap';
import { unreadNotifications, unreadTotal } from '../lib/selectors';
import { ChatsScreen } from '../screens/ChatsScreen';
import { FamilyScreen } from '../screens/FamilyScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_META: Record<keyof TabParamList, { icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap; label: string }> = {
  Chats: { icon: 'chatbubbles-outline', activeIcon: 'chatbubbles', label: 'Chats' },
  Family: { icon: 'people-outline', activeIcon: 'people', label: 'Family' },
  Notifications: { icon: 'notifications-outline', activeIcon: 'notifications', label: 'Alerts' },
  Profile: { icon: 'person-circle-outline', activeIcon: 'person-circle', label: 'Profile' },
};

function TabButton({
  name,
  focused,
  badge,
  onPress,
}: {
  name: keyof TabParamList;
  focused: boolean;
  badge: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  const meta = TAB_META[name];
  const scale = useSharedValue(focused ? 1 : 0.94);
  scale.value = withSpring(focused ? 1.04 : 0.94, { damping: 16, stiffness: 260 });
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={meta.label}
      style={styles.tabItem}
    >
      <Animated.View
        style={[
          animated,
          styles.tabPill,
          {
            backgroundColor: focused ? theme.primarySoft : 'transparent',
            borderRadius: 16,
          },
        ]}
      >
        <Ionicons
          name={focused ? meta.activeIcon : meta.icon}
          size={23}
          color={focused ? theme.primary : theme.tabInactive}
        />
        {badge > 0 ? (
          <View style={[styles.badge, { backgroundColor: theme.badge, borderColor: theme.tabBar }]}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        ) : null}
      </Animated.View>
      <Text style={[styles.tabLabel, { color: focused ? theme.primary : theme.tabInactive, fontWeight: focused ? '800' : '600' }]}>
        {meta.label}
      </Text>
    </Pressable>
  );
}

export function MainTabs() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { db, user } = useApp();

  const chatBadge = db && user ? unreadTotal(db, user.id) : 0;
  const alertBadge = db && user ? unreadNotifications(db, user.id) : 0;
  const badges: Record<keyof TabParamList, number> = {
    Chats: chatBadge,
    Family: 0,
    Notifications: alertBadge,
    Profile: 0,
  };

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => (
        <View
          style={[
            styles.bar,
            {
              backgroundColor: theme.tabBar,
              borderTopColor: theme.tabBarBorder,
              paddingBottom: Math.max(insets.bottom, 10),
              height: 64 + Math.max(insets.bottom, 10),
            },
          ]}
        >
          {state.routes.map((route, index) => (
            <TabButton
              key={route.key}
              name={route.name as keyof TabParamList}
              focused={state.index === index}
              badge={badges[route.name as keyof TabParamList]}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (state.index !== index && !event.defaultPrevented) navigation.navigate(route.name);
              }}
            />
          ))}
        </View>
      )}
    >
      <Tab.Screen name="Chats" component={ChatsScreen} />
      <Tab.Screen name="Family" component={FamilyScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tabItem: { alignItems: 'center', justifyContent: 'center', gap: 3, flex: 1, maxWidth: 130 },
  tabPill: { width: 56, height: 34, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 10.5, letterSpacing: 0.2 },
  badge: {
    position: 'absolute',
    top: -3,
    right: 11,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#FFFFFF', fontSize: 9.5, fontWeight: '800' },
});
