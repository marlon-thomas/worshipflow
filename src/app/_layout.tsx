import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { SessionProvider, useSession } from '@/lib/session';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, membership, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync();
    const inAuthGroup = segments[0] === '(auth)';
    const inTeamSetup = segments[0] === 'team-setup';
    if (!session && !inAuthGroup) {
      router.replace('/login');
    } else if (session && !membership && !inTeamSetup) {
      router.replace('/team-setup');
    } else if (session && membership && (inAuthGroup || inTeamSetup)) {
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
    <SessionProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RootNavigator />
      </ThemeProvider>
    </SessionProvider>
  );
}
