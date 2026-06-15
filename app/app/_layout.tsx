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
import { useContext, useEffect, useState } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { initDatabase, getDb } from '@/db';
import { SQLiteSettingsRepository } from '@/repositories/SQLiteSettingsRepository';
import { ThemeContext, ThemeContextProvider } from '@/contexts/ThemeContext';
import { UnitsContextProvider } from '@/contexts/UnitsContext';
import type { ThemePreference, UnitsPreference } from '@/services/settingsUtils';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const settingsRepo = new SQLiteSettingsRepository(getDb());

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_900Black,
  });
  const [dbReady, setDbReady] = useState(false);
  const [initialTheme, setInitialTheme] = useState<ThemePreference>('system');
  const [initialUnits, setInitialUnits] = useState<UnitsPreference>('system');

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    initDatabase()
      .then(async () => {
        const [theme, units] = await Promise.all([
          settingsRepo.get('theme'),
          settingsRepo.get('units'),
        ]);
        setInitialTheme((theme as ThemePreference | null) ?? 'system');
        setInitialUnits((units as UnitsPreference | null) ?? 'system');
        setDbReady(true);
      })
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

  return (
    <ThemeContextProvider initialPreference={initialTheme} repo={settingsRepo}>
      <UnitsContextProvider initialPreference={initialUnits} repo={settingsRepo}>
        <RootLayoutNav />
      </UnitsContextProvider>
    </ThemeContextProvider>
  );
}

function RootLayoutNav() {
  const themeCtx = useContext(ThemeContext)!;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={themeCtx.resolved === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="add-exercise" options={{ presentation: 'modal', title: 'Nouvel exercice' }} />
          <Stack.Screen name="add-programme" options={{ presentation: 'modal', title: 'Programme' }} />
          <Stack.Screen name="import-template" options={{ presentation: 'modal', title: 'Importer un template' }} />
          <Stack.Screen name="programme/[id]" options={{ title: 'Programme' }} />
          <Stack.Screen name="add-workout" options={{ presentation: 'modal', title: 'Séance' }} />
          <Stack.Screen name="workout/[id]" options={{ title: 'Séance' }} />
          <Stack.Screen name="add-workout-exercise" options={{ presentation: 'modal', title: 'Ajouter un exercice' }} />
          <Stack.Screen name="session/[workoutId]" options={{ headerShown: false }} />
          <Stack.Screen name="history/[sessionLogId]" options={{ title: 'Détail séance' }} />
          <Stack.Screen name="progression/[exerciseId]" options={{ title: 'Progression' }} />
          <Stack.Screen name="progression/search" options={{ title: 'Rechercher un exercice' }} />
          <Stack.Screen name="scan-programme" options={{ title: 'Scanner un programme', headerShown: true }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
