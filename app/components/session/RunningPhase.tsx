// app/components/session/RunningPhase.tsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { CircularTimer } from '@/components/ui/CircularTimer';
import type { WorkoutExerciseDetail, BlockWithSets } from '@/services/WorkoutExerciseService';
import type { Set as TrainingSet } from '@/db/types';
import type { SetActual, LastSetLog } from '@/services/SessionService';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import { useUnits } from '@/hooks/useUnits';
import { lbsToKg } from '@/services/settingsUtils';

interface RunningPhaseProps {
  exercise: WorkoutExerciseDetail;
  block: BlockWithSets;
  set: TrainingSet;
  progressLabel: string;
  onValidate: (actual: SetActual) => Promise<void>;
  onSkip: () => void;
  onSkipExercise: () => void;
  onUndo: () => void;
  canUndo: boolean;
  lastSetLog?: LastSetLog | null;
}

function formatLastLog(log: LastSetLog, isCardio: boolean, isDuration: boolean, convert: (kg: number) => string, unitLabel: string): string {
  if (isCardio) {
    const parts: string[] = [];
    if (log.durationSeconds) parts.push(`${Math.round(log.durationSeconds / 60)} min`);
    if (log.distanceMeters) parts.push(`${(log.distanceMeters / 1000).toFixed(1)} km`);
    return `Dernière fois : ${parts.length > 0 ? parts.join(' · ') : '—'}`;
  }
  if (isDuration) {
    const m = Math.floor((log.durationSeconds ?? 0) / 60);
    const s = (log.durationSeconds ?? 0) % 60;
    return `Dernière fois : ${m}:${String(s).padStart(2, '0')}`;
  }
  const weightStr = log.weightDone > 0 ? ` × ${convert(log.weightDone)} ${unitLabel}` : '';
  return `Dernière fois : ${log.repsDone} rép${weightStr}`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function RunningPhase({ exercise, block, set, progressLabel, onValidate, onSkip, onSkipExercise, onUndo, canUndo, lastSetLog }: RunningPhaseProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { convert, label: unitLabel, resolved: unitResolved } = useUnits();

  const skipExerciseSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['30%'], []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    [],
  );

  const isCardio = exercise.exercise.type === 'cardio';
  const isDuration = exercise.exercise.type !== 'etirement' && !isCardio && (set.duration_seconds ?? 0) > 0;

  const [reps, setReps] = useState(String(set.reps_max));
  const [weight, setWeight] = useState(
    set.weight_type === 'bodyweight' ? '0' : set.weight != null ? convert(set.weight) : ''
  );
  const [rpe, setRpe] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(set.duration_seconds ?? 0);
  const [timerDone, setTimerDone] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [cardioMinutes, setCardioMinutes] = useState('');
  const [cardioDistance, setCardioDistance] = useState('');

  useEffect(() => {
    if (!isDuration || !timerStarted) return;
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(interval);
          setTimerDone(true);
          Vibration.vibrate([0, 300, 100, 300]);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isDuration, timerStarted]);

  async function handleValidate() {
    if (loading) return;
    setLoading(true);
    try {
      const weightKg = unitResolved === 'lbs'
        ? lbsToKg(parseFloat(weight) || 0)
        : parseFloat(weight) || 0;
      await onValidate({
        repsDone: parseInt(reps, 10) || 0,
        weightDone: weightKg,
        rpe: rpe.trim() ? parseInt(rpe, 10) : null,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDurationValidate() {
    if (loading) return;
    setLoading(true);
    try {
      await onValidate({ repsDone: 1, weightDone: 0, rpe: null });
    } finally {
      setLoading(false);
    }
  }

  async function handleCardioValidate() {
    if (loading) return;
    setLoading(true);
    try {
      const mins = parseFloat(cardioMinutes);
      const km = parseFloat(cardioDistance);
      await onValidate({
        repsDone: 1,
        weightDone: 0,
        rpe: null,
        durationSeconds: isNaN(mins) ? null : Math.round(mins * 60),
        distanceMeters: isNaN(km) ? null : Math.round(km * 1000),
      });
    } finally {
      setLoading(false);
    }
  }

  const setLabel = set.reps_min === set.reps_max
    ? `${set.reps_min} rép`
    : `${set.reps_min}–${set.reps_max} rép`;
  const weightLabel = set.weight_type === 'bodyweight'
    ? 'PC'
    : set.weight_type === 'bar'
      ? 'barre'
      : set.weight != null
        ? `${convert(set.weight)} ${unitLabel}`
        : `— ${unitLabel}`;
  const currentSetIndex = block.sets.findIndex(s => s.id === set.id);
  const restSets = currentSetIndex >= 0 ? block.sets.slice(currentSetIndex + 1) : [];

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextGroup}>
            <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={1}>
              {exercise.exercise.name}
            </Text>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>{progressLabel}</Text>
            <View style={styles.blockBadge}>
              <Text style={[styles.blockBadgeText, { color: colors.primary }]}>{block.name.toUpperCase()}</Text>
            </View>
            <View
              style={styles.seriesDots}
              accessible
              accessibilityLabel={`Série ${currentSetIndex + 1} sur ${block.sets.length}`}
            >
              {block.sets.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i < currentSetIndex && { backgroundColor: '#16a34a' },
                    i === currentSetIndex && { backgroundColor: colors.primary, width: 10, height: 10, borderRadius: 5 },
                    i > currentSetIndex && { borderColor: colors.border, borderWidth: 1.5 },
                  ]}
                />
              ))}
            </View>
            {lastSetLog && (
              <Text style={[styles.lastLog, { color: colors.textSecondary }]}>
                {formatLastLog(lastSetLog, isCardio, isDuration, convert, unitLabel)}
              </Text>
            )}
          </View>
          <PressableA11y
            onPress={onUndo}
            accessibilityLabel="Annuler la dernière série"
            accessibilityState={{ disabled: !canUndo }}
            style={[styles.undoBtn, !canUndo && styles.undoBtnDisabled]}
            disabled={!canUndo}
          >
            <Ionicons name="arrow-undo-outline" size={22} color={canUndo ? colors.text : colors.textSecondary} />
          </PressableA11y>
        </View>
      </View>

      {isCardio ? (
        <>
          <View style={[styles.targetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.targetText, { color: colors.text }]}>🏃 Footing</Text>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Durée (min)</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={cardioMinutes}
                onChangeText={setCardioMinutes}
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel="Durée du footing en minutes"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Distance (km)</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={cardioDistance}
                onChangeText={setCardioDistance}
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel="Distance du footing en kilomètres"
              />
            </View>
          </View>

          <PressableA11y
            accessibilityLabel="Valider le footing"
            onPress={handleCardioValidate}
            style={[styles.validateBtn, { backgroundColor: '#ea580c' }]}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.validateBtnText}>{loading ? 'Validation…' : 'Valider le footing'}</Text>
          </PressableA11y>
        </>
      ) : isDuration ? (
        <>
          {/* Durée cible */}
          <View style={[styles.targetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.targetText, { color: colors.text }]}>{formatTime(set.duration_seconds ?? 0)}</Text>
          </View>

          {timerStarted && (
            <View
              accessible={true}
              accessibilityLabel={`Temps restant : ${countdown} secondes${timerDone ? ', terminé' : ''}`}
            >
              <CircularTimer
                progress={countdown / (set.duration_seconds ?? 1)}
                remaining={countdown}
                label={timerDone ? 'TERMINÉ ✓' : 'EN COURS…'}
                size={160}
              />
            </View>
          )}

          {/* Bouton durée */}
          {!timerStarted ? (
            <PressableA11y
              accessibilityLabel="Lancer le décompte"
              onPress={() => setTimerStarted(true)}
              style={[styles.validateBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.validateBtnText}>Lancer ▶</Text>
            </PressableA11y>
          ) : (
            <PressableA11y
              accessibilityLabel="C'est fait — valider cet exercice"
              onPress={handleDurationValidate}
              style={[styles.validateBtn, { backgroundColor: timerDone ? '#16a34a' : colors.primary }]}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.validateBtnText}>{loading ? 'Validation…' : "C'est fait"}</Text>
            </PressableA11y>
          )}
        </>
      ) : (
        <>
          {/* Cible */}
          <View style={[styles.targetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.targetText, { color: colors.text }]}>{weightLabel} × {setLabel}</Text>
          </View>

          {/* Saisie */}
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Reps</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={reps}
                onChangeText={setReps}
                keyboardType="numeric"
                accessibilityLabel="Répétitions réalisées"
              />
            </View>
            <View style={[styles.inputGroup, set.weight_type !== 'fixed' && styles.inputGroupDisabled]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Poids ({unitLabel})</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder={set.weight === null ? 'Poids de départ' : '—'}
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel="Poids utilisé"
                editable={set.weight_type === 'fixed'}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>RPE (1–10)</Text>
              <Text style={[styles.inputHint, { color: colors.textSecondary }]}>Effort perçu — optionnel</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={rpe}
                onChangeText={setRpe}
                keyboardType="numeric"
                placeholder="—"
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel="RPE effort perçu de 1 à 10, optionnel"
              />
            </View>
          </View>

          <PressableA11y
            accessibilityLabel="Valider la série avec les valeurs saisies"
            onPress={handleValidate}
            style={[styles.validateBtn, { backgroundColor: '#16a34a' }]}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.validateBtnText}>{loading ? 'Validation…' : 'Valider'}</Text>
          </PressableA11y>
        </>
      )}

      {/* Séries restantes */}
      {restSets.length > 0 && (
        <View style={styles.restSection}>
          <Text style={[styles.restLabel, { color: colors.textSecondary }]}>SÉRIES RESTANTES</Text>
          {restSets.map((s, i) => (
            <Text key={s.id} style={[styles.restSet, { color: colors.textSecondary }]}>
              {i + currentSetIndex + 2} ·{s.weight != null ? `${convert(s.weight)} ${unitLabel}` : 'PC'} × {s.reps_min === s.reps_max ? s.reps_min : `${s.reps_min}–${s.reps_max}`}
            </Text>
          ))}
        </View>
      )}

      <PressableA11y
        accessibilityLabel="Passer cette série"
        onPress={onSkip}
        style={styles.skipBtn}
      >
        <Text style={[styles.skipText, { color: colors.textSecondary }]}>Passer →</Text>
      </PressableA11y>

      <PressableA11y
        accessibilityLabel="Passer toutes les séries restantes de cet exercice"
        onPress={() => skipExerciseSheetRef.current?.expand()}
        style={styles.skipBtn}
      >
        <Text style={[styles.skipExerciseText, { color: colors.textSecondary }]}>Passer l&apos;exercice →</Text>
      </PressableA11y>
    </ScrollView>

      <BottomSheet
        ref={skipExerciseSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetView style={styles.sheetContainer}>
          <Text style={[styles.sheetTitle, { color: colors.text }]} numberOfLines={1}>
            {exercise.exercise.name}
          </Text>
          <Text style={[styles.sheetMessage, { color: colors.textSecondary }]}>
            Passer toutes les séries restantes ?
          </Text>
          <PressableA11y
            accessibilityLabel="Confirmer — passer l'exercice entier"
            onPress={() => {
              skipExerciseSheetRef.current?.close();
              onSkipExercise();
            }}
            style={[styles.sheetDestructiveBtn, { backgroundColor: '#dc2626' }]}
          >
            <Text style={styles.sheetBtnText}>Passer l&apos;exercice</Text>
          </PressableA11y>
          <PressableA11y
            accessibilityLabel="Annuler"
            onPress={() => skipExerciseSheetRef.current?.close()}
            style={[styles.sheetCancelBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.sheetCancelText, { color: colors.text }]}>Annuler</Text>
          </PressableA11y>
        </BottomSheetView>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, gap: 14 },
  header: { gap: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerTextGroup: { flex: 1, gap: 2, marginTop: 16 },
  undoBtn: { padding: 8, marginTop: 16 },
  undoBtnDisabled: { opacity: 0.3 },
  exerciseName: { fontSize: 22, fontWeight: '700' },
  progressLabel: { fontSize: 13 },
  blockBadge: { alignSelf: 'flex-start', marginTop: 4 },
  blockBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  seriesDots: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  targetCard: { padding: 16, borderRadius: Radius.sm, borderWidth: 1, alignItems: 'center' },
  targetText: { fontSize: 20, fontWeight: '600' },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputGroup: { flex: 1, gap: 4 },
  inputGroupDisabled: { opacity: 0.4 },
  inputLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  inputHint: { fontSize: 10, textAlign: 'center', marginBottom: 2 },
  input: { borderWidth: 1, borderRadius: Radius.sm, padding: 10, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  validateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: Radius.sm },
  validateBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  lastLog: { fontSize: 12, marginTop: 4 },
  restSection: { gap: 4 },
  restLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  restSet: { fontSize: 13, lineHeight: 20 },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 14 },
  skipExerciseText: { fontSize: 13 },
  sheetContainer: { paddingHorizontal: 24, paddingVertical: 8, gap: 12 },
  sheetTitle: { fontSize: 17, fontWeight: '600' },
  sheetMessage: { fontSize: 15 },
  sheetDestructiveBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10 },
  sheetBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sheetCancelBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10, borderWidth: 1 },
  sheetCancelText: { fontSize: 16, fontWeight: '500' },
});
