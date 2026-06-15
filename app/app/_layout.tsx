import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useURL } from 'expo-linking';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useContext, useEffect, useRef, useState } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { initDatabase, getDb } from '@/db';
import { SQLiteSettingsRepository } from '@/repositories/SQLiteSettingsRepository';
import { SQLiteBlockRepository } from '@/repositories/SQLiteBlockRepository';
import { SQLiteExerciseRepository } from '@/repositories/SQLiteExerciseRepository';
import { SQLiteProgramRepository } from '@/repositories/SQLiteProgramRepository';
import { SQLiteSetRepository } from '@/repositories/SQLiteSetRepository';
import { SQLiteWorkoutExerciseRepository } from '@/repositories/SQLiteWorkoutExerciseRepository';
import { SQLiteWorkoutRepository } from '@/repositories/SQLiteWorkoutRepository';
import { SQLiteSessionLogRepository } from '@/repositories/SQLiteSessionLogRepository';
import { ThemeContext, ThemeContextProvider } from '@/contexts/ThemeContext';
import { UnitsContextProvider } from '@/contexts/UnitsContext';
import { ShareProgramService } from '@/services/ShareProgramService';
import { ExpoNotificationScheduler } from '@/services/ExpoNotificationScheduler';
import { NotificationService } from '@/services/NotificationService';
import type { NotifSettings } from '@/services/NotificationService';
import type { ThemePreference, UnitsPreference } from '@/services/settingsUtils';

const NOTIF_KEY = 'notif_settings';

async function loadNotifSettings(): Promise<NotifSettings | null> {
  const repo = new SQLiteSettingsRepository(getDb());
  const raw = await repo.get(NOTIF_KEY);
  return raw ? JSON.parse(raw) as NotifSettings : null;
}

async function persistNotifSettings(s: NotifSettings): Promise<void> {
  const repo = new SQLiteSettingsRepository(getDb());
  await repo.set(NOTIF_KEY, JSON.stringify(s));
}

const notifScheduler = new ExpoNotificationScheduler();
const notifService = new NotificationService(notifScheduler, loadNotifSettings, persistNotifSettings);

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

  useEffect(() => {
    if (!dbReady) return;
    const sessionLogRepo = new SQLiteSessionLogRepository(getDb());
    sessionLogRepo.findMostRecent()
      .then(session => {
        const lastDate = session ? new Date(session.started_at) : null;
        return notifService.scheduleInactivityCheck(lastDate);
      })
      .catch(console.error);
  }, [dbReady]);

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
  const url = useURL();
  const router = useRouter();
  const lastImportedUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!url || url === lastImportedUrl.current) return;
    lastImportedUrl.current = url;
    try {
      const parsed = new URL(url);
      if (parsed.hostname === 'import') {
        const data = parsed.searchParams.get('data');
        if (!data) return;
        const db = getDb();
        const svc = new ShareProgramService(
          new SQLiteProgramRepository(db),
          new SQLiteWorkoutRepository(db),
          new SQLiteWorkoutExerciseRepository(db),
          new SQLiteBlockRepository(db),
          new SQLiteSetRepository(db),
          new SQLiteExerciseRepository(db),
        );
        svc.importPayload(data).then(programId => {
          router.push(`/programme/${programId}`);
        }).catch(console.error);
      }
    } catch {
      // URL non parseable — ignorer
    }
  }, [url, router]);

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
