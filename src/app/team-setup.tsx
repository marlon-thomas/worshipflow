import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/session';

export default function TeamSetupScreen() {
  const theme = useTheme();
  const { refreshMembership } = useSession();
  const [displayName, setDisplayName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function createTeam() {
    setMessage(null);
    setBusy(true);
    try {
      const { error } = await supabase.rpc('create_team', {
        team_name: teamName.trim(),
        display_name: displayName.trim(),
      });
      if (error) throw error;
      await refreshMembership();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not create team');
    } finally {
      setBusy(false);
    }
  }

  const joinTeam = async () => {
    setMessage(null);
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('join_team', {
        invite: inviteCode.trim(),
        display_name: displayName.trim(),
      });
      if (error) throw error;
      if (!data || (Array.isArray(data) && data.length === 0)) {
        throw new Error('Invalid invite code');
      }
      await refreshMembership();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not join team');
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = [
    styles.input,
    { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
          <ThemedText type="subtitle">Your team</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Create a team for your church, or join one with an invite code.
          </ThemedText>

          <TextInput
            style={inputStyle}
            placeholder="Your name (shown to the team)"
            placeholderTextColor={theme.textSecondary}
            value={displayName}
            onChangeText={setDisplayName}
          />

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Create a new team</ThemedText>
            <TextInput
              style={inputStyle}
              placeholder="Team name, e.g. Grace Church Worship"
              placeholderTextColor={theme.textSecondary}
              value={teamName}
              onChangeText={setTeamName}
            />
            <Pressable
              style={[styles.primaryButton, { backgroundColor: theme.text, opacity: busy || !teamName.trim() ? 0.5 : 1 }]}
              disabled={busy || !teamName.trim()}
              onPress={createTeam}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                Create team
              </ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Join with invite code</ThemedText>
            <TextInput
              style={inputStyle}
              placeholder="Invite code, e.g. 3f9a1c2b"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              value={inviteCode}
              onChangeText={setInviteCode}
            />
            <Pressable
              style={[styles.primaryButton, { backgroundColor: theme.text, opacity: busy || !inviteCode.trim() ? 0.5 : 1 }]}
              disabled={busy || !inviteCode.trim()}
              onPress={joinTeam}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                Join team
              </ThemedText>
            </Pressable>
          </ThemedView>

          {busy && <ActivityIndicator color={theme.text} />}
          {message && <ThemedText type="small">{message}</ThemedText>}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    fontSize: 16,
  },
  primaryButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + 2,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
});
