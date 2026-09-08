import { Image } from 'expo-image';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { Song } from '@/lib/types';

export default function SongsScreen() {
  const theme = useTheme();
  const { team } = useSession();
  const [songs, setSongs] = useState<Song[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!team) return;
    setLoading(true);
    const { data } = await supabase
      .from('songs')
      .select('*')
      .eq('team_id', team.id)
      .order('title', { ascending: true });
    setSongs((data as Song[]) ?? []);
    setLoading(false);
  }, [team?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const q = query.trim().toLowerCase();
  const filtered = q
    ? songs.filter((s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q))
    : songs;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Songs</ThemedText>
          <Link href="/song/new" asChild>
            <Pressable style={[styles.newButton, { backgroundColor: theme.text }]}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                + Add song
              </ThemedText>
            </Pressable>
          </Link>
        </View>

        <TextInput
          style={[styles.search, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          placeholder="Search title or artist…"
          placeholderTextColor={theme.textSecondary}
          value={query}
          onChangeText={setQuery}
        />

        {loading ? (
          <ActivityIndicator color={theme.text} style={styles.loading} />
        ) : !team ? (
          <ThemedView style={styles.noTeam}>
            <ThemedText type="subtitle">No team yet</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Create or join a team to manage songs.
            </ThemedText>
          </ThemedView>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, gap: Spacing.two }}
            ListEmptyComponent={
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                {q ? 'No matching songs.' : 'No songs yet. Add your first song with Spotify & YouTube links.'}
              </ThemedText>
            }
            renderItem={({ item }) => (
              <Link href={`/song/${item.id}`} asChild>
                <Pressable style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                  {item.album_art_url ? (
                    <Image source={{ uri: item.album_art_url }} style={styles.art} />
                  ) : (
                    <View style={[styles.art, styles.artPlaceholder, { backgroundColor: theme.backgroundSelected }]}>
                      <ThemedText type="small" themeColor="textSecondary">
                        ♪
                      </ThemedText>
                    </View>
                  )}
                  <View style={styles.cardText}>
                    <ThemedText numberOfLines={1} style={styles.cardTitle}>
                      {item.title}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {item.artist || 'Unknown artist'}
                    </ThemedText>
                  </View>
                  <View style={[styles.keyBadge, { borderColor: theme.backgroundSelected }]}>
                    <ThemedText type="smallBold">{item.default_key}</ThemedText>
                  </View>
                </Pressable>
              </Link>
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  newButton: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  search: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    fontSize: 16,
    marginBottom: Spacing.three,
  },
  loading: { marginTop: Spacing.five },
  empty: { marginTop: Spacing.five, textAlign: 'center' },
  noTeam: { marginTop: Spacing.five, alignItems: 'center', gap: Spacing.two, textAlign: 'center', paddingHorizontal: Spacing.four },
  card: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  art: { width: 44, height: 44, borderRadius: Spacing.one },
  artPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  keyBadge: {
    borderWidth: 1,
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    minWidth: 36,
    alignItems: 'center',
  },
});
