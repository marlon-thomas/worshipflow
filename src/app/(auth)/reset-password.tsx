import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const { access_token, refresh_token, type } = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
    type?: string;
  }>();
  const theme = useTheme();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sessionSet, setSessionSet] = useState(false);

  useEffect(() => {
    if (access_token && refresh_token && type === 'recovery' && !sessionSet) {
      supabase.auth.setSession({ access_token, refresh_token }).then(() => {
        setSessionSet(true);
      });
    }
  }, [access_token, refresh_token, type, sessionSet]);

  async function submit() {
    if (password !== confirm) {
      setMessage('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters');
      return;
    }
    setMessage(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage('Password updated. Redirecting…');
      setTimeout(() => router.replace('/login'), 1500);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!sessionSet) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
          <ThemedText type="subtitle">Reset password</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Enter your new password below.
          </ThemedText>

          {!isSupabaseConfigured && (
            <ThemedView type="backgroundElement" style={styles.banner}>
              <ThemedText type="small">
                Supabase is not configured yet.
              </ThemedText>
            </ThemedView>
          )}

          <View style={styles.form}>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
              placeholder="New password"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
              placeholder="Confirm new password"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
            />
            <Pressable
              style={[styles.primaryButton, { backgroundColor: theme.text, opacity: busy ? 0.6 : 1 }]}
              disabled={busy}
              onPress={submit}>
              {busy ? (
                <ActivityIndicator color={theme.background} />
              ) : (
                <ThemedText type="smallBold" style={{ color: theme.background }}>
                  Update password
                </ThemedText>
              )}
            </Pressable>
            <Pressable onPress={() => router.replace('/login')}>
              <ThemedText type="linkPrimary" style={styles.switchMode}>
                Back to sign in
              </ThemedText>
            </Pressable>
            {message && <ThemedText type="small">{message}</ThemedText>}
          </View>
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
  center: { alignItems: 'center', justifyContent: 'center' },
  banner: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  form: { gap: Spacing.three, marginTop: Spacing.two },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    fontSize: 16,
  },
  primaryButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  switchMode: { textAlign: 'center', marginTop: Spacing.two },
});