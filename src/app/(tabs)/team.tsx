import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { shareText } from '@/lib/share';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/session';
import { spotifyDisconnect, spotifyStartUrl, spotifyStatus, SpotifyStatus } from '@/lib/spotify';
import { supabase } from '@/lib/supabase';
import { TeamMember } from '@/lib/types';

export default function TeamScreen() {
  const theme = useTheme();
  const { team, membership, signOut } = useSession();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [copied, setCopied] = useState(false);
  const [spotify, setSpotify] = useState<SpotifyStatus | null>(null);
  const [spotifyBusy, setSpotifyBusy] = useState(false);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);

  useEffect(() => {
    if (!team) return;
    supabase
      .from('team_members')
      .select('*')
      .eq('team_id', team.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMembers((data as TeamMember[]) ?? []));
  }, [team?.id]);

  // Refresh Spotify status whenever the screen gains focus
  // (the connect flow happens in the browser, then the user returns here).
  const refreshSpotify = useCallback(() => {
    spotifyStatus()
      .then(setSpotify)
      .catch(() => setSpotify(null));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshSpotify();
    }, [refreshSpotify])
  );

  async function connectSpotify() {
    setSpotifyBusy(true);
    setSpotifyError(null);
    try {
      const { url } = await spotifyStartUrl();
      await WebBrowser.openBrowserAsync(url);
      refreshSpotify();
    } catch (err) {
      setSpotifyError(err instanceof Error ? err.message : String(err));
    } finally {
      setSpotifyBusy(false);
    }
  }

  async function disconnectSpotify() {
    setSpotifyBusy(true);
    try {
      await spotifyDisconnect();
      setSpotify({ connected: false, spotifyDisplayName: null });
    } catch (err) {
      setSpotifyError(err instanceof Error ? err.message : String(err));
    } finally {
      setSpotifyBusy(false);
    }
  }

  async function copyInviteCode() {
    if (!team) return;
    await Clipboard.setStringAsync(team.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareTeamViaWhatsApp() {
    if (!team) return;
    const text = `🎵 Join "${team.name}" on WorshipFlow!\n\nInvite code: ${team.invite_code}\n\nGet the app: ${window.location.origin}/worshipflow`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    await Linking.openURL(url);
  }

  async function shareTeamViaShareSheet() {
    if (!team) return;
    const text = `🎵 Join "${team.name}" on WorshipFlow!\n\nInvite code: ${team.invite_code}\n\nGet the app: ${window.location.origin}/worshipflow`;
    await shareText('Join WorshipFlow Team', text);
  }

  const isLeader = membership?.role === 'leader';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ThemedText type="subtitle" style={styles.title}>
          {team?.name ?? 'Team'}
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.inviteCard}>
          <ThemedText type="small" themeColor="textSecondary">
            Invite code — share this with your team
          </ThemedText>
          <Pressable onPress={copyInviteCode} style={styles.inviteRow}>
            <ThemedText type="subtitle">{team?.invite_code}</ThemedText>
            <ThemedText type="linkPrimary">{copied ? 'Copied!' : 'Tap to copy'}</ThemedText>
          </Pressable>
          <View style={styles.shareRow}>
            <Pressable style={styles.shareButtonWhatsApp} onPress={shareTeamViaWhatsApp}>
              <ThemedText type="smallBold" style={{ color: '#fff' }}>
                📱 WhatsApp
              </ThemedText>
            </Pressable>
            <Pressable style={styles.shareButtonGeneric} onPress={shareTeamViaShareSheet}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                📤 Share via…
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.inviteCard}>
          <ThemedText type="smallBold">🎧 Spotify for playlists</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Only ONE person (usually the worship leader) needs to connect their Spotify account.
            This person's account will be used to auto-create and sync setlist playlists.
            Everyone else just opens the shared playlist link — no Spotify login needed!
          </ThemedText>
          {spotify?.connected ? (
            <View style={styles.spotifyRow}>
              <ThemedText type="small" style={{ color: '#1DB954', fontWeight: '700' }}>
                ● Connected as {spotify.spotifyDisplayName}
              </ThemedText>
              {isLeader && (
                <Pressable onPress={disconnectSpotify} disabled={spotifyBusy}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Disconnect
                  </ThemedText>
                </Pressable>
              )}
            </View>
          ) : isLeader ? (
            <Pressable
              style={[styles.spotifyButton, { opacity: spotifyBusy ? 0.6 : 1 }]}
              disabled={spotifyBusy}
              onPress={connectSpotify}>
              <ThemedText type="smallBold" style={{ color: '#fff' }}>
                Connect Spotify (Leader only)
              </ThemedText>
            </Pressable>
          ) : (
            <ThemedText type="small" themeColor="textSecondary" style={styles.waitingText}>
              Waiting for leader to connect Spotify…
            </ThemedText>
          )}
          {spotifyError && <ThemedText type="small">{spotifyError}</ThemedText>}
        </ThemedView>

        <ThemedText type="smallBold" style={styles.membersTitle}>
          Members ({members.length})
        </ThemedText>
        <FlatList
          data={members}
          keyExtractor={(m) => m.user_id}
          contentContainerStyle={{ gap: Spacing.two, paddingBottom: BottomTabInset + Spacing.four }}
          renderItem={({ item }) => (
            <ThemedView type="backgroundElement" style={styles.memberRow}>
              <View>
                <ThemedText type="default">{item.display_name || 'Team member'}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.role === 'leader' ? '👑 Leader' : '🎸 Member'}
                </ThemedText>
              </View>
              {item.user_id === membership?.user_id && (
                <ThemedText type="small" themeColor="textSecondary">
                  you
                </ThemedText>
              )}
            </ThemedView>
          )}
        />

        <Pressable onPress={signOut} style={[styles.signOut, { borderColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold">Sign out</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  title: { paddingVertical: Spacing.three },
  inviteCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  membersTitle: { marginBottom: Spacing.two },
  spotifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spotifyButton: {
    backgroundColor: '#1DB954',
    borderRadius: 999,
    paddingVertical: Spacing.two + 2,
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
  },
  memberRow: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shareRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  shareButtonWhatsApp: {
    flex: 1,
    backgroundColor: '#25D366',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + 2,
    alignItems: 'center',
  },
  shareButtonGeneric: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + 2,
    alignItems: 'center',
  },
  waitingText: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: Spacing.two,
  },
  signOut: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.three,
    marginBottom: BottomTabInset,
  },
});
