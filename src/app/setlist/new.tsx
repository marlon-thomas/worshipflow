import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

/** Next Sunday (or today if today is Sunday) as YYYY-MM-DD. */
function nextSunday(): string {
  const d = new Date();
  const add = (7 - d.getDay()) % 7;
  d.setDate(d.getDate() + add);
  return d.toISOString().slice(0, 10);
}

export default function NewSetlistScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { team, session } = useSession();
  const [title, setTitle] = useState('Sunday Service');
  const [date, setDate] = useState(nextSunday());
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputStyle = [
    styles.input,
    { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement },
  ];

  async function create() {
    if (!team || !title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Enter a title and a date in YYYY-MM-DD format.');
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error } = await supabase
      .from('setlists')
      .insert({ team_id: team.id, title: title.trim(), service_date: date, notes: notes.trim(), created_by: session?.user.id ?? null })
      .select()
      .single();
    setBusy(false);
    if (error) {
      setError(error.message);
    } else if (data) {
      router.replace(`/setlist/${data.id}`);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="smallBold">Service title</ThemedText>
        <TextInput style={inputStyle} value={title} onChangeText={setTitle} placeholder="e.g. Sunday Service" placeholderTextColor={theme.textSecondary} />

        <ThemedText type="smallBold">Date (YYYY-MM-DD)</ThemedText>
        <TextInput style={inputStyle} value={date} onChangeText={setDate} placeholder="2025-09-14" placeholderTextColor={theme.textSecondary} autoCapitalize="none" />

        <ThemedText type="smallBold">Notes (optional)</ThemedText>
        <TextInput style={inputStyle} value={notes} onChangeText={setNotes} placeholder="Anything the team should know" placeholderTextColor={theme.textSecondary} />

        <Pressable
          style={[styles.createButton, { backgroundColor: theme.text, opacity: busy ? 0.6 : 1 }]}
          disabled={busy}
          onPress={create}>
          {busy ? (
            <ActivityIndicator color={theme.background} />
          ) : (
            <ThemedText type="smallBold" style={{ color: theme.background }}>
              Create setlist
            </ThemedText>
          )}
        </Pressable>
        {error && <ThemedText type="small">{error}</ThemedText>}
      </View>
    </ThemedView>
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
  createButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
});
