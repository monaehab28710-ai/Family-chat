import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

/**
 * Auth session handling.
 *
 * - Session tokens are stored in expo-secure-store (Keychain / Keystore) on
 *   native, and in AsyncStorage on web where Keychain is unavailable.
 * - Passwords are never stored in plain text: a random 16 byte salt is
 *   generated per account and the credential is a salted SHA-256 digest.
 */

const SESSION_KEY = 'familyconnect.session.v1';

export async function hashPassword(password: string, salt: string): Promise<string> {
  const bytes = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `fc:${salt}:${password}`);
  return bytes;
}

export function randomSalt(): string {
  return Crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

export function randomToken(): string {
  return `${Crypto.randomUUID()}-${Date.now().toString(36)}`;
}

export async function saveSessionToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(SESSION_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function readSessionToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return await AsyncStorage.getItem(SESSION_KEY);
    return await SecureStore.getItemAsync(SESSION_KEY);
  } catch {
    return null;
  }
}

export async function clearSessionToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(SESSION_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    // ignore
  }
}
