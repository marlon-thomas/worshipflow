import { Tabs } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { Colors } from '@/constants/theme';

export default function TabsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' || scheme === 'dark' ? 'dark' : 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Setlists',
          tabBarIcon: ({ focused }) => (
            focused ? 'list.bullet.rectangle.fill' : 'list.bullet.rectangle'
          ),
        }}
      />
      <Tabs.Screen
        name="songs"
        options={{
          title: 'Songs',
          tabBarIcon: () => 'music.note.list',
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: 'Team',
          tabBarIcon: ({ focused }) => (
            focused ? 'person.2.fill' : 'person.2'
          ),
        }}
      />
    </Tabs>
  );
}
