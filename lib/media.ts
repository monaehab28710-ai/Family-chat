import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { photoSource } from './seed';

/** Opens the device library and returns a local uri, or null if cancelled. */
export async function pickDeviceImage(): Promise<string | null> {
  try {
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) return null;
    return result.assets[0].uri;
  } catch {
    return null;
  }
}

export interface DemoPhoto {
  label: string;
  uri: string;
  asset: number;
}

export const DEMO_PHOTOS: DemoPhoto[] = [
  { label: 'Sunset', uri: 'photo://0', asset: 0 },
  { label: 'Garden', uri: 'photo://1', asset: 1 },
  { label: 'Beach', uri: 'photo://2', asset: 2 },
  { label: 'Dinner', uri: 'photo://3', asset: 3 },
  { label: 'Cake', uri: 'photo://4', asset: 4 },
];

/** Bundled photos are referenced with a photo:// scheme and resolved here. */
export function resolveImageSource(uri?: string | null) {
  if (!uri) return photoSource(0);
  if (uri.startsWith('photo://')) {
    const index = Number(uri.replace('photo://', '')) || 0;
    return photoSource(index);
  }
  return { uri };
}

export function isBundledPhoto(uri?: string | null) {
  return Boolean(uri && uri.startsWith('photo://'));
}
