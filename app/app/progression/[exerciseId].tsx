import { Spacing } from '@/constants/Spacing';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, TextInput } from 'react-native';
import { LetterSpacing } from '@/constants/Typography';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { BarChart } from 'react-native-gifted-charts';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { ProgressionService, Session1RM } from '@/services/ProgressionService';
import type { PersonalRecord, Goal } from '@/db/types';
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
import type { ExerciseSession, ExerciseSetRecord } from '@/services/ExerciseHistoryService';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { GoalService } from '@/services/GoalService';
import { SQLiteGoalRepository } from '@/repositories/SQLiteGoalRepository';
import { computeETA } from '@/services/goalETA';

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

function formatCardioSet(s: ExerciseSetRecord): string {
  const parts: string[] = [];
  if (s.distance_meters != null && s.distance_meters > 0) {
    parts.push(`${(s.distance_meters / 1000).toFixed(1)} km`);
  }
  if (s.duration_seconds != null && s.duration_seconds > 0) {
    const min = Math.floor(s.duration_seconds / 60);
    const sec = s.duration_seconds % 60;
    parts.push(sec > 0 ? `${min}min ${sec}s` : `${min}min`);
  }
  return parts.length > 0 ? parts.join(' · ') : '—';
}

function getTargetDateFromChip(chip: '1m' | '3m' | '6m' | '1y' | 'none'): string | null {
  if (chip === 'none') return null;
  const d = new Date();
  if (chip === '1m') d.setMonth(d.getMonth() + 1);
  else if (chip === '3m') d.setMonth(d.getMonth() + 3);
  else if (chip === '6m') d.setMonth(d.getMonth() + 6);
  else if (chip === '1y') d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function formatEtaDate(isoDate: string): string {
  return new Date(isoDate + 'T12:00:00Z').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function makeGoalService(): GoalService {
  const db = getDb();
  return new GoalService(new SQLiteGoalRepository(db), new SQLiteExerciseRepository(db));
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

  const goalServiceRef = useRef<GoalService | null>(null);
  if (goalServiceRef.current == null) goalServiceRef.current = makeGoalService();
  const goalService = goalServiceRef.current;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [goalSheetVisible, setGoalSheetVisible] = useState(false);
  const [targetWeightInput, setTargetWeightInput] = useState('');
  const [selectedChip, setSelectedChip] = useState<'1m' | '3m' | '6m' | '1y' | 'none'>('3m');
  const goalSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['55%'], []);

  // Load goal for this exercise
  useEffect(() => {
    const id = Number(exerciseId);
    goalService.getGoal(id).then(g => {
      if (mountedRef.current) setGoal(g);
    }).catch(() => {});
  }, [exerciseId, goalService]);

  // Auto-detect achievement
  useEffect(() => {
    if (!goal || goal.achieved_at) return;
    const lastWeight = exerciseHistory?.recentSessions[0]?.bestSet.weight ?? 0;
    if (lastWeight > 0 && lastWeight >= goal.target_weight) {
      const now = new Date().toISOString();
      goalService.markAchieved(goal.id, now).then(() => {
        if (mountedRef.current) setGoal(prev => prev ? { ...prev, achieved_at: now } : null);
      }).catch(() => {});
    }
  }, [goal, exerciseHistory, goalService]);

  // BottomSheet toggle
  useEffect(() => {
    if (goalSheetVisible) {
      goalSheetRef.current?.expand();
    } else {
      goalSheetRef.current?.close();
    }
  }, [goalSheetVisible]);

  const handleSaveGoal = useCallback(async () => {
    const w = parseFloat(targetWeightInput.replace(',', '.'));
    if (isNaN(w) || w <= 0) return;
    const targetDate = getTargetDateFromChip(selectedChip);
    const saved = await goalService.setGoal(Number(exerciseId), w, targetDate);
    if (mountedRef.current) {
      setGoal(saved);
      setGoalSheetVisible(false);
    }
  }, [targetWeightInput, selectedChip, exerciseId, goalService]);

  const handleDeleteGoal = useCallback(async () => {
    if (!goal) return;
    await goalService.deleteGoal(goal.id);
    if (mountedRef.current) setGoal(null);
  }, [goal, goalService]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} onPress={() => setGoalSheetVisible(false)} />
    ),
    [],
  );

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
    frontColor: i === history.length - 1 ? colors.primary : colors.textDisabled,
    labelTextStyle: { color: colors.textSecondary, fontSize: 9 },
  }));

  const isBodyweight = exerciseHistory?.recentSessions.every(s => s.bestSet.weight === 0) ?? false;
  const isCardio = exerciseHistory?.exercise.type === 'cardio';

  const etaSessions = (exerciseHistory?.recentSessions ?? [])
    .slice(-12)
    .map(s => ({ date: s.date, weight: s.bestSet.weight }));

  const eta = goal && !goal.achieved_at
    ? computeETA(etaSessions, goal.target_weight, goal.target_date ?? undefined)
    : null;

  const previewTargetWeight = parseFloat(targetWeightInput.replace(',', '.'));
  const previewEta = !isNaN(previewTargetWeight) && previewTargetWeight > 0
    ? computeETA(etaSessions, previewTargetWeight, getTargetDateFromChip(selectedChip) ?? undefined)
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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
                · {isCardio
                  ? formatCardioSet(s)
                  : s.weight > 0 ? `${convert(s.weight)} ${unitLabel} × ${s.reps} reps` : `Poids de corps × ${s.reps} reps`}
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
                  {isCardio
                    ? formatCardioSet(session.bestSet)
                    : session.bestSet.weight > 0
                      ? `${convert(session.bestSet.weight)} ${unitLabel} × ${session.bestSet.reps}`
                      : `${session.bestSet.reps} reps`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {!isBodyweight && !isCardio && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>OBJECTIF</Text>

            {!goal && (
              <PressableA11y
                accessibilityLabel="Définir un objectif de poids"
                onPress={() => {
                  setTargetWeightInput('');
                  setSelectedChip('3m');
                  setGoalSheetVisible(true);
                }}
                style={[styles.goalButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.goalButtonText, { color: colors.primary }]}>Définir un objectif</Text>
              </PressableA11y>
            )}

            {goal && goal.achieved_at && (
              <View>
                <Text style={[styles.goalAchieved, { color: colors.primary }]}>
                  ✦ {convert(goal.target_weight)} {unitLabel} · Atteint le {new Date(goal.achieved_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
                <PressableA11y
                  accessibilityLabel="Supprimer l'objectif"
                  onPress={handleDeleteGoal}
                  style={styles.goalDeleteBtn}
                >
                  <Text style={[styles.goalDeleteText, { color: colors.textSecondary }]}>Supprimer</Text>
                </PressableA11y>
              </View>
            )}

            {goal && !goal.achieved_at && eta && (
              <View>
                <Text style={[styles.goalText, { color: colors.text }]}>
                  {convert(goal.target_weight)} {unitLabel}
                  {eta.status === 'on_track' && ` · ETA : ${formatEtaDate(eta.etaDate)} (+${eta.ratePerWeek} kg/sem)`}
                  {eta.status === 'stagnant' && ' · ETA non calculable'}
                  {eta.status === 'no_data' && ' · Trop peu de séances pour estimer'}
                </Text>
                {eta.status === 'on_track' && eta.projectedAtTargetDate !== undefined && goal.target_date && (
                  <Text style={[styles.goalProjection, { color: colors.textSecondary }]}>
                    À la date cible ({new Date(goal.target_date + 'T12:00:00Z').toLocaleDateString('fr-FR', { month: 'long' })}) : ~{convert(eta.projectedAtTargetDate)} {unitLabel} estimés
                  </Text>
                )}
                <PressableA11y
                  accessibilityLabel="Supprimer l'objectif"
                  onPress={handleDeleteGoal}
                  style={styles.goalDeleteBtn}
                >
                  <Text style={[styles.goalDeleteText, { color: colors.textSecondary }]}>Supprimer</Text>
                </PressableA11y>
              </View>
            )}
          </View>
        )}

        {history.length === 0 && !bestPR && !histLoading && (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune donnée pour cet exercice</Text>
          </View>
        )}
      </ScrollView>

      {/* BottomSheet — goal creation */}
      <BottomSheet
        ref={goalSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onClose={() => setGoalSheetVisible(false)}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Objectif de poids</Text>
          <TextInput
            style={[styles.sheetInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="Poids cible (kg)"
            placeholderTextColor={colors.textSecondary}
            value={targetWeightInput}
            onChangeText={setTargetWeightInput}
            keyboardType="decimal-pad"
            accessibilityLabel="Poids cible en kilogrammes"
          />
          <Text style={[styles.sheetLabel, { color: colors.textSecondary }]}>Date cible</Text>
          <View style={styles.chipsRow}>
            {(['1m', '3m', '6m', '1y', 'none'] as const).map(chip => (
              <PressableA11y
                key={chip}
                accessibilityLabel={chip === 'none' ? 'Sans date' : chip === '1m' ? '1 mois' : chip === '3m' ? '3 mois' : chip === '6m' ? '6 mois' : '1 an'}
                accessibilityState={{ selected: selectedChip === chip }}
                onPress={() => setSelectedChip(chip)}
                style={[
                  styles.chip,
                  { backgroundColor: selectedChip === chip ? colors.primary : colors.background, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.chipText, { color: selectedChip === chip ? colors.onPrimary : colors.text }]}>
                  {chip === 'none' ? 'Aucune' : chip === '1m' ? '1 mois' : chip === '3m' ? '3 mois' : chip === '6m' ? '6 mois' : '1 an'}
                </Text>
              </PressableA11y>
            ))}
          </View>
          {previewEta && (
            <Text style={[styles.sheetPreview, { color: colors.textSecondary }]}>
              {previewEta.status === 'on_track' && `ETA : ${formatEtaDate(previewEta.etaDate)} (+${previewEta.ratePerWeek} kg/sem)`}
              {previewEta.status === 'achieved' && '✦ Objectif déjà atteint !'}
              {previewEta.status === 'stagnant' && 'ETA non calculable'}
              {previewEta.status === 'no_data' && 'Trop peu de séances pour estimer'}
            </Text>
          )}
          <PressableA11y
            accessibilityLabel="Enregistrer l'objectif"
            onPress={handleSaveGoal}
            style={[styles.sheetSaveBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.sheetSaveBtnText, { color: colors.onPrimary }]}>Enregistrer</Text>
          </PressableA11y>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxxl },
  title: { fontSize: 20, fontWeight: '700', marginBottom: Spacing.xs },
  section: { borderRadius: Radius.sm, padding: Spacing.lg, gap: Spacing.sm },
  sectionLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: LetterSpacing.wide },
  prValue: { fontSize: 18, fontWeight: '700' },
  prMeta: { fontSize: 13 },
  prRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  prRowValue: { fontSize: 14, fontWeight: '500' },
  prRowDate: { fontSize: 12 },
  setRow: { fontSize: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, textAlign: 'center' },
  goalButton: { borderWidth: 1, borderRadius: Radius.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, alignSelf: 'flex-start' },
  goalButtonText: { fontSize: 14, fontWeight: '600' },
  goalText: { fontSize: 15, fontWeight: '500' },
  goalProjection: { fontSize: 13, marginTop: Spacing.xs },
  goalAchieved: { fontSize: 15, fontWeight: '600' },
  goalDeleteBtn: { marginTop: Spacing.sm, alignSelf: 'flex-start' },
  goalDeleteText: { fontSize: 13 },
  sheetContent: { padding: Spacing.xl, gap: Spacing.md },
  sheetTitle: { fontSize: 17, fontWeight: '700' },
  sheetInput: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, fontSize: 16 },
  sheetLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: LetterSpacing.wide },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { borderWidth: 1, borderRadius: Radius.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  chipText: { fontSize: 13, fontWeight: '500' },
  sheetPreview: { fontSize: 13, fontStyle: 'italic' },
  sheetSaveBtn: { borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xs },
  sheetSaveBtnText: { fontSize: 15, fontWeight: '600' },
});
