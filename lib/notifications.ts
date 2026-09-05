import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Push notification bridge.
 *
 * In production this device registers an FCM/APNs token and the FamilyConnect
 * server (see docs/ARCHITECTURE.md) delivers data-only pushes to members of a
 * conversation. Here we configure the same handler and surface local
 * notifications, which exercise the identical payload path on device.
 */

let ready = false;
let granted = false;

export async function initNotifications(): Promise<boolean> {
  if (ready) return granted;
  ready = true;
  if (Platform.OS === 'web') return false;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Family messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 120, 200],
        lightColor: '#FF6B4A',
      });
    }
    const current = await Notifications.getPermissionsAsync();
    granted = current.granted;
    if (!granted) {
      const request = await Notifications.requestPermissionsAsync();
      granted = request.granted;
    }
  } catch {
    granted = false;
  }
  return granted;
}

export function notificationsGranted() {
  return granted;
}

export async function showLocalNotification(title: string, body: string, data?: Record<string, string>) {
  if (Platform.OS === 'web' || !granted) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data ?? {},
        sound: false,
        ...(Platform.OS === 'android' ? { channelId: 'messages' } : {}),
      } as Notifications.NotificationContentInput,
      trigger: null,
    });
  } catch {
    // best effort - in-app notifications still work
  }
}

export async function clearNotificationBadges() {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {
    // ignore
  }
}
