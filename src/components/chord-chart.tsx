import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { renderChordChart } from '@/lib/chordpro';

interface ChordChartProps {
  chordpro: string;
}

/** Monospace chord-over-lyric rendering of a ChordPro chart. */
export function ChordChart({ chordpro }: ChordChartProps) {
  const theme = useTheme();
  const lines = renderChordChart(chordpro);
  return (
    <View style={styles.container}>
      {lines.map((line, i) => (
        <View key={i}>
          {line.chords !== '' && (
            <ThemedText style={[styles.mono, styles.chords, { color: '#3c87f7' }]}>{line.chords}</ThemedText>
          )}
          <ThemedText style={[styles.mono, { color: theme.text }]}>
            {line.lyrics === '' ? ' ' : line.lyrics}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  mono: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    lineHeight: 20,
  },
  chords: {
    fontWeight: '700',
  },
});
