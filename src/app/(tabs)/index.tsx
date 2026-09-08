import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { Setlist } from '@/lib/types';
import { shareText } from '@/lib/share';

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SetlistsScreen() {
  const theme = useTheme();
  const { team, membership } = useSession();
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!team) return;
    setLoading(true);
    const { data } = await supabase
      .from('setlists')
      .select('*')
      .eq('team_id', team.id)
      .order('service_date', { ascending: true });
    setSetlists((data as Setlist[]) ?? []);
    setLoading(false);
  }, [team?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const isLeader = membership?.role === 'leader';

  async function copyInviteCode() {
    if (!team) return;
    await Clipboard.setStringAsync(team.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareViaWhatsApp() {
    if (!team) return;
    const text = `🎵 Join "${team.name}" on WorshipFlow!\n\nInvite code: ${team.invite_code}\n\nGet the app: ${window.location.origin}/worshipflow`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    await Linking.openURL(url);
  }

  async function shareViaEmail() {
    if (!team) return;
    const subject = encodeURIComponent(`Join "${team.name}" on WorshipFlow`);
    const body = encodeURIComponent(`🎵 Join "${team.name}" on WorshipFlow!\n\nInvite code: ${team.invite_code}\n\nGet the app: ${window.location.origin}/worshipflow`);
    const url = `mailto:?subject=${subject}&body=${body}`;
    await Linking.openURL(url);
  }

  async function shareViaSMS() {
    if (!team) return;
    const text = encodeURIComponent(`🎵 Join "${team.name}" on WorshipFlow!\n\nInvite code: ${team.invite_code}\n\nGet the app: ${window.location.origin}/worshipflow`);
    const url = `sms:?body=${text}`;
    await Linking.openURL(url);
  }

  async function shareViaShareSheet() {
    if (!team) return;
    const text = `🎵 Join "${team.name}" on WorshipFlow!\n\nInvite code: ${team.invite_code}\n\nGet the app: ${window.location.origin}/worshipflow`;
    await shareText('Join WorshipFlow Team', text);
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = setlists.filter((s) => s.service_date >= today);
  const past = setlists.filter((s) => s.service_date < today).reverse();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Services</ThemedText>
          <Link href="/setlist/new" asChild>
            <Pressable style={[styles.newButton, { backgroundColor: theme.text }]}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                + New setlist
              </ThemedText>
            </Pressable>
          </Link>
        </View>

        {loading ? (
          <ActivityIndicator color={theme.text} style={styles.loading} />
        ) : !team ? (
          <ThemedView style={styles.noTeam}>
            <ThemedText type="subtitle">No team yet</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Create or join a team to manage setlists.
            </ThemedText>
          </ThemedView>
        ) : (
          <>
            {isLeader && (
              <ThemedView type="backgroundElement" style={styles.inviteCard}>
                <ThemedText type="smallBold">📩 Invite team members</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Share the invite code so band members can join.
                </ThemedText>
                <Pressable onPress={copyInviteCode} style={styles.inviteRow}>
                  <ThemedText type="subtitle">{team.invite_code}</ThemedText>
                  <ThemedText type="linkPrimary">{copied ? 'Copied!' : 'Tap to copy'}</ThemedText>
                </Pressable>
                <View style={styles.shareRow}>
                  <Pressable style={styles.shareButtonWhatsApp} onPress={shareViaWhatsApp}>
                    <ThemedText type="smallBold" style={{ color: '#fff' }}>
                      📱 WhatsApp
                    </ThemedText>
                  </Pressable>
                  <Pressable style={styles.shareButtonEmail} onPress={shareViaEmail}>
                    <ThemedText type="smallBold" style={{ color: '#fff' }}>
                      📧 Email
                    </ThemedText>
                  </Pressable>
                  <Pressable style={styles.shareButtonSMS} onPress={shareViaSMS}>
                    <ThemedText type="smallBold" style={{ color: '#fff' }}>
                      💬 SMS
                    </ThemedText>
                  </Pressable>
                  <Pressable style={styles.shareButtonGeneric} onPress={shareViaShareSheet}>
                    <ThemedText type="smallBold" style={{ color: theme.background }}>
                      📤 More…
                    </ThemedText>
                  </Pressable>
                </View>
              </ThemedView>
            )}

            <FlatList
              data={[...upcoming, ...past]}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, gap: Spacing.two }}
              ListEmptyComponent={
                <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                  No setlists yet. Create one for your next service.
                </ThemedText>
              }
              renderItem={({ item }) => {
                const isPast = item.service_date < today;
                return (
                  <Link href={`/setlist/${item.id}`} asChild>
                    <Pressable
                      style={[styles.card, { backgroundColor: theme.backgroundElement, opacity: isPast ? 0.55 : 1 }]}>
                      <View style={styles.cardText}>
                        <ThemedText type="default" style={styles.cardTitle}>
                          {item.title}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {formatDate(item.service_date)}
                          {isPast ? ' · past' : ''}
                        </ThemedText>
                      </View>
                      <ThemedText type="small" themeColor="textSecondary">
                        ›
                      </ThemedText>
                    </Pressable>
                  </Link>
                );
              }}
            />
          </>
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
  loading: { marginTop: Spacing.five },
  empty: { marginTop: Spacing.five, textAlign: 'center' },
  noTeam: { marginTop: Spacing.five, alignItems: 'center', gap: Spacing.two, textAlign: 'center', paddingHorizontal: Spacing.four },
  card: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardText: { gap: 2, flexShrink: 1 },
  cardTitle: { fontWeight: '600' },
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
    paddingVertical: Spacing.one,
  },
  shareRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  shareButtonWhatsApp: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#25D366',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + 2,
    alignItems: 'center',
  },
  shareButtonEmail: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#EA4335',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + 2,
    alignItems: 'center',
  },
  shareButtonSMS: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#34A853',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + 2,
    alignItems: 'center',
  },
  shareButtonGeneric: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + 2,
    alignItems: 'center',
  },
});
