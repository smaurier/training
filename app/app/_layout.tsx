import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { initDatabase } from '@/db';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_900Black,
  });
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    initDatabase()
      .then(() => setDbReady(true))
      .catch((e) => { throw e; });
  }, []);

  useEffect(() => {
    if (loaded && dbReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, dbReady]);

  if (!loaded || !dbReady) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="add-exercise"
          options={{ presentation: 'modal', title: 'Nouvel exercice' }}
        />
        <Stack.Screen
          name="add-programme"
          options={{ presentation: 'modal', title: 'Programme' }}
        />
        <Stack.Screen
          name="programme/[id]"
          options={{ title: 'Programme' }}
        />
        <Stack.Screen
          name="add-workout"
          options={{ presentation: 'modal', title: 'Séance' }}
        />
        <Stack.Screen
          name="workout/[id]"
          options={{ title: 'Séance' }}
        />
        <Stack.Screen
          name="add-workout-exercise"
          options={{ presentation: 'modal', title: 'Ajouter un exercice' }}
        />
        <Stack.Screen
          name="session/[workoutId]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="history/[sessionLogId]"
          options={{ title: 'Détail séance' }}
        />
        <Stack.Screen
          name="progression/[exerciseId]"
          options={{ title: 'Progression' }}
        />
      </Stack>
    </ThemeProvider>
  );
}
