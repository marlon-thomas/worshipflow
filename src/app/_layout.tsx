import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SessionProvider, useSession } from '@/lib/session';
import { ErrorBoundary } from '@/components/error-boundary';
import { SWUpdateBanner } from '@/components/sw-update-banner';

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}

function RootNavigator() {
  const { session, membership, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (Platform.OS !== 'web') {
      SplashScreen.hideAsync();
    }
    // Don't redirect away from reset-password screen (needs session to update password)
    const inAuthGroup = segments[0] === '(auth)';
    const inTeamSetup = segments[0] === 'team-setup';
    const onResetPassword = segments[0] === 'reset-password' as typeof segments[0] | 'reset-password';
    if (!session && !inAuthGroup && !onResetPassword) {
      router.replace('/login');
    } else if (session && !membership && !inTeamSetup && !onResetPassword) {
      router.replace('/team-setup');
    } else if (session && membership && (inAuthGroup || inTeamSetup) && !onResetPassword) {
      router.replace('/');
    }
  }, [session, membership, loading, segments]);

  return (
    <Stack>
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen name="team-setup" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="setlist/new" options={{ title: 'New setlist' }} />
      <Stack.Screen name="setlist/[id]" options={{ title: 'Setlist' }} />
      <Stack.Screen name="song/new" options={{ title: 'Add song' }} />
      <Stack.Screen name="song/[id]" options={{ title: 'Song' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ErrorBoundary>
      <SessionProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <SWUpdateBanner />
          <RootNavigator />
        </ThemeProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}
