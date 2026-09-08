import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { Setlist } from '@/lib/types';

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SetlistsScreen() {
  const theme = useTheme();
  const { team } = useSession();
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);

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
});
