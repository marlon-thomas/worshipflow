import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ALL_KEYS } from '@/lib/transpose';

interface KeyPickerProps {
  value: string;
  onChange: (key: string) => void;
  compact?: boolean;
}

/** Horizontal chip row of all major & minor keys. */
export function KeyPicker({ value, onChange, compact }: KeyPickerProps) {
  const theme = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {ALL_KEYS.map((key) => {
        const selected = key === value;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={[
              styles.chip,
              compact && styles.chipCompact,
              {
                backgroundColor: selected ? theme.text : theme.backgroundElement,
              },
            ]}>
            <ThemedText
              type={compact ? 'smallBold' : 'default'}
              style={{ color: selected ? theme.background : theme.text }}>
              {key}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  chipCompact: {
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
  },
});
