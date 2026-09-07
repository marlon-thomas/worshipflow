import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const theme = useTheme();
  const [mode, setMode] = useState<'sign-in' | 'sign-up' | 'forgot'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setMessage(null);
    setBusy(true);
    try {
      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else if (mode === 'sign-up') {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        setMessage('Account created. If email confirmation is enabled, check your inbox before signing in.');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/worshipflow/reset-password`,
        });
        if (error) throw error;
        setMessage('Password reset email sent. Check your inbox.');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
          <ThemedText type="subtitle">WorshipFlow</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Setlists, keys, lyrics and chord charts for your worship team.
          </ThemedText>

          {!isSupabaseConfigured && (
            <ThemedView type="backgroundElement" style={styles.banner}>
              <ThemedText type="small">
                Supabase is not configured yet. Copy .env.example to .env and fill in your project URL and anon key,
                then restart the app.
              </ThemedText>
            </ThemedView>
          )}

          <View style={styles.form}>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
              placeholder="Email"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            {(mode === 'sign-in' || mode === 'sign-up') && (
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
                placeholder="Password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            )}
            <Pressable
              style={[styles.primaryButton, { backgroundColor: theme.text, opacity: busy ? 0.6 : 1 }]}
              disabled={busy}
              onPress={submit}>
              {busy ? (
                <ActivityIndicator color={theme.background} />
              ) : (
                <ThemedText type="smallBold" style={{ color: theme.background }}>
                  {mode === 'sign-in' ? 'Sign in' : mode === 'sign-up' ? 'Create account' : 'Send reset link'}
                </ThemedText>
              )}
            </Pressable>
            <View style={styles.modeRow}>
              {mode === 'sign-in' && (
                <>
                  <Pressable onPress={() => setMode('sign-up')}>
                    <ThemedText type="linkPrimary">New here? Create an account</ThemedText>
                  </Pressable>
                  <Pressable onPress={() => setMode('forgot')} style={{ marginTop: Spacing.two }}>
                    <ThemedText type="linkPrimary">Forgot password?</ThemedText>
                  </Pressable>
                </>
              )}
              {mode === 'sign-up' && (
                <Pressable onPress={() => setMode('sign-in')}>
                  <ThemedText type="linkPrimary">Have an account? Sign in</ThemedText>
                </Pressable>
              )}
              {mode === 'forgot' && (
                <Pressable onPress={() => setMode('sign-in')}>
                  <ThemedText type="linkPrimary">Back to sign in</ThemedText>
                </Pressable>
              )}
            </View>
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
  switchMode: { textAlign: 'center' },
  modeRow: { gap: Spacing.two, flexDirection: 'column' },
});
