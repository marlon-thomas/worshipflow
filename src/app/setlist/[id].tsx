import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { shareText } from '@/lib/share';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ChordChart } from '@/components/chord-chart';
import { KeyPicker } from '@/components/key-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { stripChords, transposeChordPro } from '@/lib/chordpro';
import { syncSetlistPlaylist } from '@/lib/spotify';
import { supabase } from '@/lib/supabase';
import { keyDelta, keyUsesFlats } from '@/lib/transpose';
import { Setlist, SetlistSong, Song } from '@/lib/types';

interface SetlistItem extends SetlistSong {
  songs: Song;
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export default function SetlistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [items, setItems] = useState<SetlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, 'lyrics' | 'chords' | undefined>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [library, setLibrary] = useState<Song[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [setlistRes, itemsRes] = await Promise.all([
      supabase.from('setlists').select('*').eq('id', id).single(),
      supabase
        .from('setlist_songs')
        .select('*, songs(*)')
        .eq('setlist_id', id)
        .order('position', { ascending: true }),
    ]);
    setSetlist((setlistRes.data as Setlist) ?? null);
    setItems(((itemsRes.data as SetlistItem[]) ?? []).filter((i) => i.songs));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function openPicker() {
    if (!setlist) return;
    const { data } = await supabase.from('songs').select('*').eq('team_id', setlist.team_id).order('title');
    setLibrary((data as Song[]) ?? []);
    setPickerOpen(true);
  }

  async function addSong(song: Song) {
    const position = items.length === 0 ? 0 : Math.max(...items.map((i) => i.position)) + 1;
    const { error } = await supabase.from('setlist_songs').insert({
      setlist_id: id,
      song_id: song.id,
      position,
      selected_key: song.default_key,
    });
    if (!error) {
      setPickerOpen(false);
      load();
    }
  }

  async function removeItem(item: SetlistItem) {
    await supabase.from('setlist_songs').delete().eq('id', item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  async function moveItem(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    await Promise.all(
      next.map((item, pos) => supabase.from('setlist_songs').update({ position: pos }).eq('id', item.id))
    );
  }

  async function changeKey(item: SetlistItem, key: string) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, selected_key: key } : i)));
    await supabase.from('setlist_songs').update({ selected_key: key }).eq('id', item.id);
  }

  async function syncPlaylist() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await syncSetlistPlaylist(id);
      setSyncMessage(`Playlist synced — ${result.trackCount} tracks.`);
      load();
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
    }
  }

  async function share() {
    if (!setlist) return;
    const lines = [
      `🎵 ${setlist.title} — ${formatDate(setlist.service_date)}`,
      setlist.notes ? `\n${setlist.notes}` : '',
      setlist.spotify_playlist_url ? `\n🎧 Spotify playlist: ${setlist.spotify_playlist_url}` : '',
      '',
      ...items.flatMap((item, idx) => {
        const s = item.songs;
        return [
          `${idx + 1}. ${s.title}${s.artist ? ` (${s.artist})` : ''} — Key: ${item.selected_key}`,
          s.spotify_url ? `   🎧 Spotify: ${s.spotify_url}` : '',
          s.youtube_url ? `   ▶️ YouTube: ${s.youtube_url}` : '',
        ].filter(Boolean);
      }),
    ];
    await shareText('WorshipFlow Setlist', lines.join('\n'));
  }

  async function shareViaWhatsApp() {
    if (!setlist) return;
    const lines = [
      `🎵 ${setlist.title} — ${formatDate(setlist.service_date)}`,
      setlist.notes ? `\n${setlist.notes}` : '',
      setlist.spotify_playlist_url ? `\n🎧 Spotify playlist: ${setlist.spotify_playlist_url}` : '',
      '',
      ...items.flatMap((item, idx) => {
        const s = item.songs;
        return [
          `${idx + 1}. ${s.title}${s.artist ? ` (${s.artist})` : ''} — Key: ${item.selected_key}`,
          s.spotify_url ? `   🎧 Spotify: ${s.spotify_url}` : '',
          s.youtube_url ? `   ▶️ YouTube: ${s.youtube_url}` : '',
        ].filter(Boolean);
      }),
    ];
    const text = lines.join('\n') + `\n\n— Shared via WorshipFlow: ${window.location.origin}/worshipflow`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    Linking.openURL(url);
  }

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }
  if (!setlist) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText>Setlist not found.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText type="subtitle">{setlist.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatDate(setlist.service_date)}
            </ThemedText>
            {setlist.notes ? <ThemedText type="small">{setlist.notes}</ThemedText> : null}
            <View style={styles.headerButtons}>
              <Pressable style={[styles.headerButton, { backgroundColor: theme.text }]} onPress={share}>
                <ThemedText type="smallBold" style={{ color: theme.background }}>
                  Send to team
                </ThemedText>
              </Pressable>
              <Pressable style={[styles.headerButton, { backgroundColor: '#25D366' }]} onPress={shareViaWhatsApp}>
                <ThemedText type="smallBold" style={{ color: '#fff' }}>
                  📱 WhatsApp
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.headerButton, { borderWidth: 1.5, borderColor: theme.text }]}
                onPress={openPicker}>
                <ThemedText type="smallBold">+ Add songs</ThemedText>
              </Pressable>
            </View>
            <View style={styles.headerButtons}>
              <Pressable
                style={[styles.headerButton, { backgroundColor: '#1DB954', opacity: syncing ? 0.6 : 1 }]}
                disabled={syncing}
                onPress={syncPlaylist}>
                <ThemedText type="smallBold" style={{ color: '#fff' }}>
                  {syncing ? 'Syncing…' : setlist.spotify_playlist_url ? '↻ Sync Spotify playlist' : 'Create Spotify playlist'}
                </ThemedText>
              </Pressable>
              {setlist.spotify_playlist_url && (
                <Pressable
                  style={[styles.headerButton, { borderWidth: 1.5, borderColor: '#1DB954' }]}
                  onPress={() => Linking.openURL(setlist.spotify_playlist_url!)}>
                  <ThemedText type="smallBold" style={{ color: '#1DB954' }}>
                    ▶ Open in Spotify
                  </ThemedText>
                </Pressable>
              )}
            </View>
            {syncMessage && <ThemedText type="small">{syncMessage}</ThemedText>}
          </View>
        }
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            No songs yet — tap “Add songs” to build the set.
          </ThemedText>
        }
        renderItem={({ item, index }) => (
          <SetlistCard
            item={item}
            index={index}
            isFirst={index === 0}
            isLast={index === items.length - 1}
            expanded={expanded[item.id]}
            onToggleExpand={(mode) =>
              setExpanded((prev) => ({ ...prev, [item.id]: prev[item.id] === mode ? undefined : mode }))
            }
            onChangeKey={(key) => changeKey(item, key)}
            onMove={(delta) => moveItem(index, delta)}
            onRemove={() => removeItem(item)}
          />
        )}
      />

      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <ThemedView style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <ThemedText type="subtitle">Add songs</ThemedText>
            <Pressable onPress={() => setPickerOpen(false)}>
              <ThemedText type="linkPrimary">Done</ThemedText>
            </Pressable>
          </View>
          <FlatList
            data={library.filter((s) => !items.some((i) => i.song_id === s.id))}
            keyExtractor={(s) => s.id}
            contentContainerStyle={{ gap: Spacing.two, padding: Spacing.four }}
            ListEmptyComponent={
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                All library songs are already in this setlist — or add new songs from the Songs tab.
              </ThemedText>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => addSong(item)}
                style={[styles.pickerRow, { backgroundColor: theme.backgroundElement }]}>
                {item.album_art_url ? (
                  <Image source={{ uri: item.album_art_url }} style={styles.pickerArt} />
                ) : null}
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold">{item.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.artist || 'Unknown artist'} · {item.default_key}
                  </ThemedText>
                </View>
                <ThemedText type="linkPrimary">+ Add</ThemedText>
              </Pressable>
            )}
          />
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

function SetlistCard({
  item,
  index,
  isFirst,
  isLast,
  expanded,
  onToggleExpand,
  onChangeKey,
  onMove,
  onRemove,
}: {
  item: SetlistItem;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  expanded: 'lyrics' | 'chords' | undefined;
  onToggleExpand: (mode: 'lyrics' | 'chords') => void;
  onChangeKey: (key: string) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const song = item.songs;
  const steps = keyDelta(song.default_key, item.selected_key);
  const transposed = song.chordpro
    ? transposeChordPro(song.chordpro, steps, keyUsesFlats(item.selected_key))
    : '';

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.cardTop}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.position}>
          {index + 1}
        </ThemedText>
        <View style={styles.cardTitleBlock}>
          <ThemedText type="default" style={styles.cardTitle}>
            {song.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {song.artist || 'Unknown artist'}
          </ThemedText>
        </View>
        <View style={[styles.keyBadge, { backgroundColor: theme.text }]}>
          <ThemedText type="smallBold" style={{ color: theme.background }}>
            {item.selected_key}
          </ThemedText>
        </View>
      </View>

      <View style={styles.actionRow}>
        {song.spotify_url && (
          <Pressable style={styles.actionPill} onPress={() => Linking.openURL(song.spotify_url!)}>
            <ThemedText type="small" style={{ color: '#1DB954', fontWeight: '700' }}>
              ▶ Spotify
            </ThemedText>
          </Pressable>
        )}
        {song.youtube_url && (
          <Pressable style={styles.actionPill} onPress={() => Linking.openURL(song.youtube_url!)}>
            <ThemedText type="small" style={{ color: '#FF0000', fontWeight: '700' }}>
              ▶ YouTube
            </ThemedText>
          </Pressable>
        )}
        {song.chordpro ? (
          <>
            <Pressable style={styles.actionPill} onPress={() => onToggleExpand('lyrics')}>
              <ThemedText type="small" style={{ color: '#3c87f7', fontWeight: '700' }}>
                {expanded === 'lyrics' ? '▾ Lyrics' : '▸ Lyrics'}
              </ThemedText>
            </Pressable>
            <Pressable style={styles.actionPill} onPress={() => onToggleExpand('chords')}>
              <ThemedText type="small" style={{ color: '#3c87f7', fontWeight: '700' }}>
                {expanded === 'chords' ? '▾ Chords' : '▸ Chords'}
              </ThemedText>
            </Pressable>
          </>
        ) : null}
      </View>

      <KeyPicker value={item.selected_key} onChange={onChangeKey} compact />

      {expanded === 'lyrics' && (
        <ScrollView style={styles.sheet}>
          <ThemedText style={styles.lyrics}>{stripChords(song.chordpro)}</ThemedText>
        </ScrollView>
      )}
      {expanded === 'chords' && (
        <ScrollView style={styles.sheet}>
          <ChordChart chordpro={transposed} />
        </ScrollView>
      )}

      <View style={styles.adminRow}>
        <Pressable disabled={isFirst} onPress={() => onMove(-1)} style={isFirst && styles.disabled}>
          <ThemedText type="small" themeColor="textSecondary">
            ↑ Move up
          </ThemedText>
        </Pressable>
        <Pressable disabled={isLast} onPress={() => onMove(1)} style={isLast && styles.disabled}>
          <ThemedText type="small" themeColor="textSecondary">
            ↓ Move down
          </ThemedText>
        </Pressable>
        <Pressable onPress={onRemove}>
          <ThemedText type="small" style={{ color: '#d64545' }}>
            Remove
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  header: { gap: Spacing.two },
  headerButtons: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  headerButton: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  empty: { textAlign: 'center', marginTop: Spacing.four },
  card: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  position: { width: 20, textAlign: 'center' },
  cardTitleBlock: { flex: 1 },
  cardTitle: { fontWeight: '700' },
  keyBadge: {
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
    minWidth: 40,
    alignItems: 'center',
  },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  actionPill: { paddingVertical: 2 },
  sheet: {
    maxHeight: 320,
    borderRadius: Spacing.one,
    padding: Spacing.two,
  },
  lyrics: { fontSize: 16, lineHeight: 26 },
  adminRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#88888844',
    paddingTop: Spacing.two,
  },
  disabled: { opacity: 0.3 },
  pickerContainer: { flex: 1, paddingTop: Spacing.five },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  pickerArt: { width: 40, height: 40, borderRadius: Spacing.one },
});
