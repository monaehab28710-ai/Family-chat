import { Platform, Share } from 'react-native';

/** Copies text to the clipboard (web) or opens the native share sheet. */
export async function copyText(text: string): Promise<'copied' | 'shared' | 'failed'> {
  try {
    if (Platform.OS === 'web') {
      const clipboard = (globalThis as { navigator?: { clipboard?: { writeText: (value: string) => Promise<void> } } }).navigator?.clipboard;
      if (clipboard?.writeText) {
        await clipboard.writeText(text);
        return 'copied';
      }
    }
    await Share.share({ message: text });
    return 'shared';
  } catch {
    return 'failed';
  }
}
