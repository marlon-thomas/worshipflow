import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { KeyPicker } from '@/components/key-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { searchSpotify, searchYouTube, SpotifyCandidate, YouTubeCandidate } from '@/lib/music-search';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export default function NewSongScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { team, session } = useSession();

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [defaultKey, setDefaultKey] = useState('C');
  const [tempo, setTempo] = useState('');
  const [chordpro, setChordpro] = useState('');

  const [spotifyResults, setSpotifyResults] = useState<SpotifyCandidate[] | null>(null);
  const [youtubeResults, setYoutubeResults] = useState<YouTubeCandidate[] | null>(null);
  const [spotifyPick, setSpotifyPick] = useState<SpotifyCandidate | null>(null);
  const [youtubePick, setYoutubePick] = useState<YouTubeCandidate | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const inputStyle = [
    styles.input,
    { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement },
  ];

  async function runSearch() {
    if (!title.trim()) return;
    setSearching(true);
    setSearchError(null);
    setSpotifyPick(null);
    setYoutubePick(null);
    const query = `${title.trim()} ${artist.trim()}`.trim();
    const [spotify, youtube] = await Promise.allSettled([searchSpotify(query), searchYouTube(query)]);
    setSpotifyResults(spotify.status === 'fulfilled' ? spotify.value : []);
    setYoutubeResults(youtube.status === 'fulfilled' ? youtube.value : []);
    const errors = [spotify, youtube]
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => String(r.reason?.message ?? r.reason));
    if (errors.length > 0) {
      setSearchError(
        `${errors.join(' · ')}\nMake sure the edge functions are deployed and API secrets are set (see README).`
      );
    }
    setSearching(false);
  }

  async function save() {
    if (!team || !title.trim()) return;
    setSaving(true);
    setSaveError(null);
    const { error } = await supabase.from('songs').insert({
      team_id: team.id,
      title: title.trim(),
      artist: artist.trim(),
      default_key: defaultKey,
      tempo: tempo ? parseInt(tempo, 10) : null,
      chordpro,
      spotify_track_id: spotifyPick?.id ?? null,
      spotify_url: spotifyPick?.url ?? null,
      youtube_video_id: youtubePick?.id ?? null,
      youtube_url: youtubePick?.url ?? null,
      album_art_url: spotifyPick?.imageUrl ?? youtubePick?.thumbnailUrl ?? null,
      created_by: session?.user.id ?? null,
    });
    setSaving(false);
    if (error) {
      setSaveError(error.message);
    } else {
      router.back();
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="smallBold">Song details</ThemedText>
        <TextInput style={inputStyle} placeholder="Title *" placeholderTextColor={theme.textSecondary} value={title} onChangeText={setTitle} />
        <TextInput style={inputStyle} placeholder="Artist / original by" placeholderTextColor={theme.textSecondary} value={artist} onChangeText={setArtist} />

        <ThemedText type="smallBold">Default key</ThemedText>
        <KeyPicker value={defaultKey} onChange={setDefaultKey} compact />

        <TextInput
          style={inputStyle}
          placeholder="Tempo (BPM, optional)"
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          value={tempo}
          onChangeText={setTempo}
        />

        <ThemedText type="smallBold">Lyrics & chords (ChordPro)</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Put chords in square brackets where they happen, e.g. [G]Amazing [D]grace. Use {'{comment: Chorus}'} for
          section labels. The chart auto-transposes to any key.
        </ThemedText>
        <TextInput
          style={[inputStyle, styles.chartInput]}
          placeholder={'[G]Amazing [D]grace how [Em]sweet…'}
          placeholderTextColor={theme.textSecondary}
          multiline
          textAlignVertical="top"
          value={chordpro}
          onChangeText={setChordpro}
        />

        <View style={styles.divider} />

        <ThemedText type="smallBold">Link recordings</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Search both platforms, then tap the exact version your team should practice — this avoids mix-ups between
          songs with the same name.
        </ThemedText>
        <Pressable
          style={[styles.searchButton, { borderColor: theme.text, opacity: title.trim() && !searching ? 1 : 0.4 }]}
          disabled={!title.trim() || searching}
          onPress={runSearch}>
          {searching ? (
            <ActivityIndicator color={theme.text} />
          ) : (
            <ThemedText type="smallBold">Search Spotify & YouTube</ThemedText>
          )}
        </Pressable>
        {searchError && <ThemedText type="small">{searchError}</ThemedText>}

        {spotifyResults !== null && (
          <>
            <ThemedText type="smallBold">Spotify — pick the right version</ThemedText>
            {spotifyResults.length === 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                No Spotify results.
              </ThemedText>
            )}
            {spotifyResults.map((r) => (
              <CandidateRow
                key={r.id}
                imageUrl={r.imageUrl}
                title={r.name}
                subtitle={`${r.artists}${r.album ? ` · ${r.album}` : ''}`}
                selected={spotifyPick?.id === r.id}
                onPress={() => setSpotifyPick(spotifyPick?.id === r.id ? null : r)}
              />
            ))}
          </>
        )}

        {youtubeResults !== null && (
          <>
            <ThemedText type="smallBold">YouTube — pick the right version</ThemedText>
            {youtubeResults.length === 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                No YouTube results.
              </ThemedText>
            )}
            {youtubeResults.map((r) => (
              <CandidateRow
                key={r.id}
                imageUrl={r.thumbnailUrl}
                title={r.title}
                subtitle={r.channel}
                selected={youtubePick?.id === r.id}
                onPress={() => setYoutubePick(youtubePick?.id === r.id ? null : r)}
              />
            ))}
          </>
        )}

        <Pressable
          style={[styles.saveButton, { backgroundColor: theme.text, opacity: title.trim() && !saving ? 1 : 0.4 }]}
          disabled={!title.trim() || saving}
          onPress={save}>
          {saving ? (
            <ActivityIndicator color={theme.background} />
          ) : (
            <ThemedText type="smallBold" style={{ color: theme.background }}>
              Save song
            </ThemedText>
          )}
        </Pressable>
        {saveError && <ThemedText type="small">{saveError}</ThemedText>}
      </ScrollView>
    </ThemedView>
  );
}

function CandidateRow({
  imageUrl,
  title,
  subtitle,
  selected,
  onPress,
}: {
  imageUrl: string | null;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.candidate,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: selected ? '#3c87f7' : 'transparent',
        },
      ]}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.candidateArt} />
      ) : (
        <View style={[styles.candidateArt, { backgroundColor: theme.backgroundSelected }]} />
      )}
      <View style={styles.candidateText}>
        <ThemedText numberOfLines={2} type="smallBold">
          {title}
        </ThemedText>
        <ThemedText numberOfLines={1} type="small" themeColor="textSecondary">
          {subtitle}
        </ThemedText>
      </View>
      <ThemedText type="small" style={{ color: selected ? '#3c87f7' : theme.textSecondary }}>
        {selected ? '✓' : '○'}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    fontSize: 16,
  },
  chartInput: {
    minHeight: 140,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  divider: { height: 1, opacity: 0.2, backgroundColor: '#888' },
  searchButton: {
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  saveButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  candidate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 2,
    padding: Spacing.two,
  },
  candidateArt: { width: 48, height: 48, borderRadius: Spacing.one },
  candidateText: { flex: 1, gap: 2 },
});
