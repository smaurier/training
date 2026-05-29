import { useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { SessionService } from '@/services/SessionService';
import { SQLiteSessionLogRepository } from '@/repositories/SQLiteSessionLogRepository';
import { SQLiteSetLogRepository } from '@/repositories/SQLiteSetLogRepository';
import { SQLitePersonalRecordRepository } from '@/repositories/SQLitePersonalRecordRepository';
import { SQLiteWorkoutRepository } from '@/repositories/SQLiteWorkoutRepository';
import { SQLiteWorkoutExerciseRepository } from '@/repositories/SQLiteWorkoutExerciseRepository';
import { SQLiteBlockRepository } from '@/repositories/SQLiteBlockRepository';
import { SQLiteSetRepository } from '@/repositories/SQLiteSetRepository';
import { SQLiteExerciseRepository } from '@/repositories/SQLiteExerciseRepository';
import { SQLiteProgramRepository } from '@/repositories/SQLiteProgramRepository';
import { getDb } from '@/db';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { Workout } from '@/db/types';

function makeSessionService(): SessionService {
  const db = getDb();
  return new SessionService(
    new SQLiteSessionLogRepository(db),
    new SQLiteSetLogRepository(db),
    new SQLitePersonalRecordRepository(db),
    new SQLiteWorkoutRepository(db),
    new SQLiteWorkoutExerciseRepository(db),
    new SQLiteBlockRepository(db),
    new SQLiteSetRepository(db),
    new SQLiteExerciseRepository(db),
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [nextWorkout, setNextWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasActiveProgram, setHasActiveProgram] = useState(false);

  const loadNextWorkout = useCallback(async () => {
    setLoading(true);
    try {
      const db = getDb();
      const programRepo = new SQLiteProgramRepository(db);
      const programs = await programRepo.findAll();
      const active = programs.find(p => p.is_active === 1);
      if (!active) {
        setHasActiveProgram(false);
        setNextWorkout(null);
        return;
      }
      setHasActiveProgram(true);
      const service = makeSessionService();
      const next = await service.getNextWorkout(active.id);
      setNextWorkout(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadNextWorkout(); }, [loadNextWorkout]));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.hero}>
        <Ionicons name="barbell-outline" size={52} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Prêt à s'entraîner ?</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : !hasActiveProgram ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Aucun programme actif</Text>
          <PressableA11y
            accessibilityLabel="Aller aux programmes"
            onPress={() => router.push('/(tabs)/programmes')}
            style={styles.linkBtn}
          >
            <Text style={[styles.linkText, { color: colors.primary }]}>Créer un programme →</Text>
          </PressableA11y>
        </View>
      ) : nextWorkout ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>PROCHAINE SÉANCE</Text>
          <Text style={[styles.workoutName, { color: colors.text }]}>{nextWorkout.name}</Text>
          <PressableA11y
            accessibilityLabel={`Démarrer ${nextWorkout.name}`}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onPress={() => router.push({ pathname: '/session/[workoutId]' as any, params: { workoutId: String(nextWorkout.id) } })}
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="play" size={18} color="#fff" />
            <Text style={styles.startBtnText}>Démarrer</Text>
          </PressableA11y>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Aucune séance configurée</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 24 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  card: { borderWidth: 1, borderRadius: 16, padding: 20, gap: 10 },
  cardLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  workoutName: { fontSize: 20, fontWeight: '700' },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkBtn: { paddingVertical: 4 },
  linkText: { fontSize: 15, fontWeight: '500' },
});
