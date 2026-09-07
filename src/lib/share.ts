import { Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';

export async function shareText(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: message });
        return;
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.warn('Web Share API failed, falling back to clipboard');
        }
      }
    }
    await Clipboard.setStringAsync(message);
    return;
  }

  // Native: use expo-sharing with a temporary text file
  const { shareAsync } = await import('expo-sharing');
  const { writeAsStringAsync } = await import('expo-file-system/legacy');
  const { documentDirectory } = await import('expo-file-system/legacy');
  const fileUri = `${documentDirectory}share.txt`;
  await writeAsStringAsync(fileUri, message, { encoding: 'utf8' });
  await shareAsync(fileUri, { dialogTitle: title });
}