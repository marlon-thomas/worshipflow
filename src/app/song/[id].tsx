import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ChordChart } from '@/components/chord-chart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { stripChords, transposeChordPro } from '@/lib/chordpro';
import { supabase } from '@/lib/supabase';
import { keyUsesFlats, transposeChord } from '@/lib/transpose';
import { Song } from '@/lib/types';

export default function SongScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'lyrics' | 'chords'>('chords');
  const [steps, setSteps] = useState(0);

  useEffect(() => {
    supabase
      .from('songs')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setSong((data as Song) ?? null);
        setLoading(false);
      });
  }, [id]);

  const transposed = useMemo(() => {
    if (!song?.chordpro) return '';
    return transposeChordPro(song.chordpro, steps, keyUsesFlats(currentKey(song, steps)));
  }, [song, steps]);

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }
  if (!song) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText>Song not found.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">{song.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {song.artist || 'Unknown artist'}
          {song.tempo ? ` · ${song.tempo} BPM` : ''}
        </ThemedText>

        <View style={styles.linkRow}>
          {song.spotify_url && (
            <Pressable
              style={[styles.linkButton, { backgroundColor: '#1DB954' }]}
              onPress={() => Linking.openURL(song.spotify_url!)}>
              <ThemedText type="smallBold" style={styles.linkText}>
                ▶ Spotify
              </ThemedText>
            </Pressable>
          )}
          {song.youtube_url && (
            <Pressable
              style={[styles.linkButton, { backgroundColor: '#FF0000' }]}
              onPress={() => Linking.openURL(song.youtube_url!)}>
              <ThemedText type="smallBold" style={styles.linkText}>
                ▶ YouTube
              </ThemedText>
            </Pressable>
          )}
        </View>

        <View style={[styles.transposeBar, { backgroundColor: theme.backgroundElement }]}>
          <Pressable onPress={() => setSteps((s) => s - 1)} style={styles.stepButton}>
            <ThemedText type="subtitle">−</ThemedText>
          </Pressable>
          <Pressable onLongPress={() => setSteps(0)} style={styles.keyDisplay}>
            <ThemedText type="small" themeColor="textSecondary">
              Key
            </ThemedText>
            <ThemedText type="subtitle">{currentKey(song, steps)}</ThemedText>
            {steps !== 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                (hold to reset)
              </ThemedText>
            )}
          </Pressable>
          <Pressable onPress={() => setSteps((s) => s + 1)} style={styles.stepButton}>
            <ThemedText type="subtitle">+</ThemedText>
          </Pressable>
        </View>

        <View style={[styles.toggle, { backgroundColor: theme.backgroundElement }]}>
          {(['chords', 'lyrics'] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              style={[styles.toggleButton, view === v && { backgroundColor: theme.background }]}>
              <ThemedText type="smallBold" themeColor={view === v ? 'text' : 'textSecondary'}>
                {v === 'chords' ? 'Chord chart' : 'Lyrics'}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {song.chordpro ? (
          view === 'chords' ? (
            <ChordChart chordpro={transposed} />
          ) : (
            <ThemedText style={styles.lyrics}>{stripChords(song.chordpro)}</ThemedText>
          )
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            No chart added for this song yet.
          </ThemedText>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function currentKey(song: Song, steps: number): string {
  return transposeChord(song.default_key, steps, keyUsesFlats(transposeChord(song.default_key, steps, false)));
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.four, gap: Spacing.three, maxWidth: 760, width: '100%', alignSelf: 'center' },
  linkRow: { flexDirection: 'row', gap: Spacing.two },
  linkButton: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  linkText: { color: '#fff' },
  transposeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.two,
    padding: Spacing.two,
  },
  stepButton: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  keyDisplay: { flex: 1, alignItems: 'center' },
  toggle: { flexDirection: 'row', borderRadius: Spacing.two, padding: Spacing.one },
  toggleButton: {
    flex: 1,
    borderRadius: Spacing.two - 2,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  lyrics: { fontSize: 18, lineHeight: 30 },
});
