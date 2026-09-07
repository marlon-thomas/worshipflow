import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSWUpdate } from '@/hooks/use-sw-update';

export function SWUpdateBanner() {
  const { updateAvailable, applyUpdate } = useSWUpdate();
  const theme = useTheme();

  if (!updateAvailable) return null;

  return (
    <ThemedView type="backgroundElement" style={styles.banner}>
      <View style={styles.row}>
        <ThemedText type="small" style={styles.text}>
          A new version is available.
        </ThemedText>
        <Pressable onPress={applyUpdate} style={styles.button}>
          <ThemedText type="smallBold" style={{ color: theme.background }}>
            Refresh
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#88888844',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 760,
    marginHorizontal: 'auto',
    width: '100%',
    paddingHorizontal: Spacing.four,
  },
  text: { flex: 1 },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
});