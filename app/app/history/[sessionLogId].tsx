import { Spacing } from '@/constants/Spacing';
import { FontFamily } from '@/constants/Typography';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { HistoryService, SessionDetail } from '@/services/HistoryService';
import { ExerciseHistorySection } from '@/components/history/ExerciseHistorySection';
import { SQLiteSessionLogRepository } from '@/repositories/SQLiteSessionLogRepository';
import { SQLiteSetLogRepository } from '@/repositories/SQLiteSetLogRepository';
import { SQLiteWorkoutRepository } from '@/repositories/SQLiteWorkoutRepository';
import { SQLiteExerciseRepository } from '@/repositories/SQLiteExerciseRepository';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { getDb } from '@/db';

const CHECKIN_ENERGY: Record<number, string> = { 1: '😴', 2: '😐', 3: '💪' };
const CHECKIN_FATIGUE: Record<number, string> = { 1: '💪', 2: '😐', 3: '😴' };
const CHECKIN_SLEEP: Record<number, string> = { 1: '😴', 2: '😐', 3: '🌙' };
const MOOD_AFTER: Record<number, string> = { 1: '😓', 2: '😌', 3: '⚡' };
const MOOD_AFTER_LABEL: Record<number, string> = { 1: 'Épuisé', 2: 'Bien', 3: 'En forme' };

function formatDuration(seconds: number): string {
  if (seconds === 0) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min${s > 0 ? ` ${s} s` : ''}` : `${s} s`;
}

function makeService(): HistoryService {
  const db = getDb();
  return new HistoryService(
    new SQLiteSessionLogRepository(db),
    new SQLiteSetLogRepository(db),
    new SQLiteWorkoutRepository(db),
    new SQLiteExerciseRepository(db),
  );
}

export default function SessionDetailScreen() {
  const { sessionLogId } = useLocalSearchParams<{ sessionLogId: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    const service = makeService();
    service.getSessionDetail(Number(sessionLogId)).then(d => {
      if (!mountedRef.current) return;
      setDetail(d);
      setIsLoading(false);
    }).catch(() => {
      if (mountedRef.current) setIsLoading(false);
    });
  }, [sessionLogId]);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.text }]}>Séance introuvable</Text>
      </View>
    );
  }

  const allRpe = detail.exercises
    .flatMap(e => e.sets)
    .map(s => s.rpe)
    .filter((r): r is number => r !== null);
  const avgRpe = allRpe.length > 0
    ? (allRpe.reduce((a, b) => a + b, 0) / allRpe.length).toFixed(1)
    : null;

  const hasCheckin =
    detail.checkinEnergy !== null ||
    detail.checkinFatigue !== null ||
    detail.checkinSleep !== null;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.statsRow, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{formatDuration(detail.durationSeconds)}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Durée</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{detail.totalSets}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Séries</Text>
        </View>
        {avgRpe !== null && (
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>RPE {avgRpe}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Moy.</Text>
          </View>
        )}
      </View>

      {hasCheckin && (
        <View style={[styles.checkinRow, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
          {detail.checkinEnergy !== null && (
            <View style={styles.checkinItem}>
              <Text style={styles.checkinEmoji}>{CHECKIN_ENERGY[detail.checkinEnergy]}</Text>
              <Text style={[styles.checkinLabel, { color: colors.textSecondary }]}>Énergie</Text>
            </View>
          )}
          {detail.checkinFatigue !== null && (
            <View style={styles.checkinItem}>
              <Text style={styles.checkinEmoji}>{CHECKIN_FATIGUE[detail.checkinFatigue]}</Text>
              <Text style={[styles.checkinLabel, { color: colors.textSecondary }]}>Fatigue</Text>
            </View>
          )}
          {detail.checkinSleep !== null && (
            <View style={styles.checkinItem}>
              <Text style={styles.checkinEmoji}>{CHECKIN_SLEEP[detail.checkinSleep]}</Text>
              <Text style={[styles.checkinLabel, { color: colors.textSecondary }]}>Sommeil</Text>
            </View>
          )}
        </View>
      )}

      {detail.moodAfter !== null && (
        <View
          style={[styles.moodRow, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}
          accessible
          accessibilityLabel={`Ressenti après séance : ${MOOD_AFTER_LABEL[detail.moodAfter]}`}
        >
          <Text style={styles.moodEmoji}>{MOOD_AFTER[detail.moodAfter]}</Text>
          <View style={styles.moodTexte}>
            <Text style={[styles.moodLabel, { color: colors.textSecondary }]}>RESSENTI</Text>
            <Text style={[styles.moodValue, { color: colors.text }]}>{MOOD_AFTER_LABEL[detail.moodAfter]}</Text>
          </View>
        </View>
      )}

      {detail.exercises.map(exercise => (
        <ExerciseHistorySection key={exercise.exerciseId} exercise={exercise} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl },
  content: { paddingBottom: Spacing.xxxl },
  statsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 17,
    fontFamily: FontFamily.bold,
  },
  statLabel: {
    fontSize: 11,
  },
  checkinRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: Spacing.md,
  },
  checkinItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  checkinEmoji: {
    fontSize: 20,
  },
  checkinLabel: {
    fontSize: 11,
  },
  message: { fontSize: 15, textAlign: 'center' },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  moodEmoji: { fontSize: 28 },
  moodTexte: { gap: 2 },
  moodLabel: { fontSize: 10, fontFamily: FontFamily.semibold, textTransform: 'uppercase', letterSpacing: 1 },
  moodValue: { fontSize: 15, fontFamily: FontFamily.semibold },
});
