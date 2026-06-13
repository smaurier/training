import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BarChart } from 'react-native-gifted-charts';
import { ProgressionService, Session1RM } from '@/services/ProgressionService';
import type { PersonalRecord } from '@/db/types';
import { SQLiteSessionLogRepository } from '@/repositories/SQLiteSessionLogRepository';
import { SQLiteSetLogRepository } from '@/repositories/SQLiteSetLogRepository';
import { SQLitePersonalRecordRepository } from '@/repositories/SQLitePersonalRecordRepository';
import { SQLiteExerciseRepository } from '@/repositories/SQLiteExerciseRepository';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import { useUnits } from '@/hooks/useUnits';
import { getDb } from '@/db';
import { useExerciseHistory } from '@/hooks/useExerciseHistory';
import type { ExerciseSession } from '@/services/ExerciseHistoryService';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function ExerciseProgressionScreen() {
  const { exerciseId, exerciseName } = useLocalSearchParams<{ exerciseId: string; exerciseName: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { convert, label: unitLabel } = useUnits();

  const [history, setHistory] = useState<Session1RM[]>([]);
  const [bestPR, setBestPR] = useState<PersonalRecord | null>(null);
  const [allPRs, setAllPRs] = useState<PersonalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    const db = getDb();
    const prRepo = new SQLitePersonalRecordRepository(db);
    const service = new ProgressionService(
      new SQLiteSessionLogRepository(db),
      new SQLiteSetLogRepository(db),
      prRepo,
      new SQLiteExerciseRepository(db),
    );
    const id = Number(exerciseId);
    Promise.all([
      service.getExercise1RMHistory(id),
      prRepo.findBestByExerciseId(id),
      prRepo.findAllByExerciseId(id),
    ]).then(([h, best, prs]) => {
      if (!mountedRef.current) return;
      setHistory(h);
      setBestPR(best);
      setAllPRs(prs);
      setIsLoading(false);
    }).catch(() => {
      if (mountedRef.current) {
        setError('Impossible de charger les données');
        setIsLoading(false);
      }
    });
  }, [exerciseId]);

  const { history: exerciseHistory, isLoading: histLoading, error: histError } = useExerciseHistory(Number(exerciseId));

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{error}</Text>
      </View>
    );
  }

  const barData = history.map((entry, i) => ({
    value: entry.estimated1RM,
    label: entry.date,
    frontColor: i === history.length - 1 ? colors.primary : (colorScheme === 'dark' ? '#1E40AF' : '#BFDBFE'),
    labelTextStyle: { color: colors.textSecondary, fontSize: 9 },
  }));

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">{exerciseName}</Text>

      {history.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ÉVOLUTION 1RM ESTIMÉ</Text>
          <View
            accessible={true}
            accessibilityLabel={`Graphique évolution 1RM estimé de ${exerciseName} sur ${history.length} séance${history.length > 1 ? 's' : ''}`}
          >
            <BarChart
              data={barData}
              barWidth={history.length <= 6 ? 32 : 20}
              noOfSections={3}
              hideRules
              xAxisThickness={0}
              yAxisThickness={0}
              barBorderRadius={3}
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
              height={100}
            />
          </View>
        </View>
      )}

      {bestPR && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>MEILLEURE MARQUE</Text>
          <Text style={[styles.prValue, { color: colors.text }]}>
            {convert(bestPR.weight)} {unitLabel} × {bestPR.reps} reps
          </Text>
          <Text style={[styles.prMeta, { color: colors.textSecondary }]}>
            1RM Epley : {convert(bestPR.estimated_1rm)} {unitLabel} · {formatDate(bestPR.achieved_at)}
          </Text>
        </View>
      )}

      {allPRs.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>HISTORIQUE PRs</Text>
          {allPRs.map((pr, i) => (
            <View
              key={pr.id}
              style={[styles.prRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
            >
              <Text style={[styles.prRowValue, { color: colors.text }]}>
                {convert(pr.weight)} {unitLabel} × {pr.reps} reps
              </Text>
              <Text style={[styles.prRowDate, { color: colors.textSecondary }]}>
                {formatDate(pr.achieved_at)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {!histLoading && histError && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Impossible de charger l&apos;historique
          </Text>
        </View>
      )}

      {!histLoading && exerciseHistory?.lastSession && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            DERNIÈRE SÉANCE — {formatDateLong(exerciseHistory.lastSession.date)}
          </Text>
          {exerciseHistory.lastSession.sets.map((s, i) => (
            <Text key={`${s.weight}-${s.reps}-${i}`} style={[styles.setRow, { color: colors.text }]}>
              · {s.weight > 0 ? `${convert(s.weight)} ${unitLabel}` : 'Poids de corps'} × {s.reps} reps
            </Text>
          ))}
        </View>
      )}

      {!histLoading && exerciseHistory && exerciseHistory.recentSessions.length > 1 && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>HISTORIQUE SÉANCES</Text>
          {exerciseHistory.recentSessions.slice(1).map((session: ExerciseSession, i) => (
            <View
              key={session.sessionLogId}
              style={[
                styles.prRow,
                i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
              ]}
            >
              <Text style={[styles.prRowDate, { color: colors.textSecondary }]}>
                {formatDateShort(session.date)}
              </Text>
              <Text style={[styles.prRowValue, { color: colors.text }]}>
                {session.bestSet.weight > 0
                  ? `${convert(session.bestSet.weight)} ${unitLabel} × ${session.bestSet.reps}`
                  : `${session.bestSet.reps} reps`}
              </Text>
            </View>
          ))}
        </View>
      )}

      {history.length === 0 && !bestPR && !histLoading && (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune donnée pour cet exercice</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  section: { borderRadius: Radius.sm, padding: 14, gap: 8 },
  sectionLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  prValue: { fontSize: 18, fontWeight: '700' },
  prMeta: { fontSize: 13 },
  prRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  prRowValue: { fontSize: 14, fontWeight: '500' },
  prRowDate: { fontSize: 12 },
  setRow: { fontSize: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
