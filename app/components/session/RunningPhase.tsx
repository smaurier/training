// app/components/session/RunningPhase.tsx
import { Spacing } from '@/constants/Spacing';
import { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Vibration, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { SeriesProgressBar } from '@/components/ui/SeriesProgressBar';
import { CircularTimer } from '@/components/ui/CircularTimer';
import type { WorkoutExerciseDetail, BlockWithSets } from '@/services/WorkoutExerciseService';
import type { Set as TrainingSet } from '@/db/types';
import type { SetActual, LastSetLog } from '@/services/SessionService';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import { SemanticColors } from '@/constants/SemanticColors';
import { LetterSpacing, FontFamily  } from '@/constants/Typography';
import { useUnits } from '@/hooks/useUnits';
import { lbsToKg } from '@/services/settingsUtils';
import { computeRepsFeedback } from '@/services/repsFeedback';
import { SubstituteSheet } from '@/components/session/SubstituteSheet';

const SWIPE_UNDO_THRESHOLD = -60;

const RPE_OPTIONS = [
  { label: 'Facile', value: '3' },
  { label: 'Normal', value: '6' },
  { label: 'Difficile', value: '9' },
] as const;

export interface RunningPhaseHandle {
  getTimerState: () => { countdown: number; started: boolean };
}

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
  onAdjustWeight?: (kg: number) => Promise<void>;
  supersetPosition?: { current: number; total: number };
  supersetExerciseNames?: string[];
  onSubstituteExercise?: (replacement: WorkoutExerciseDetail['exercise']) => void;
  isSubstituted?: boolean;
  initialCountdown?: number;
  initialTimerStarted?: boolean;
  onFinish?: () => Promise<void>;
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

function parseMuscleGroups(json: string): string[] {
  try { return JSON.parse(json) as string[]; }
  catch { return []; }
}

export const RunningPhase = forwardRef<RunningPhaseHandle, RunningPhaseProps>(function RunningPhase({ exercise, block, set, progressLabel, onValidate, onSkip, onSkipExercise, onUndo, canUndo, lastSetLog, onAdjustWeight, supersetPosition, supersetExerciseNames, onSubstituteExercise, isSubstituted, initialCountdown, initialTimerStarted, onFinish }: RunningPhaseProps, ref) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { convert, label: unitLabel, resolved: unitResolved } = useUnits();

  const skipExerciseSheetRef = useRef<BottomSheet>(null);
  const descriptionSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['45%'], []);
  const descriptionSnapPoints = useMemo(() => ['80%'], []);

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
  const isEtirement = exercise.exercise.type === 'etirement';
  const isDuration = !isCardio && (set.duration_seconds ?? 0) > 0;

  const [reps, setReps] = useState(String(set.reps_min));
  const [weight, setWeight] = useState(
    set.weight_type === 'bodyweight' ? '0' : set.weight != null ? convert(set.weight) : ''
  );
  const [rpe, setRpe] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(initialCountdown ?? (set.duration_seconds ?? 0));
  const [timerDone, setTimerDone] = useState(false);
  const [timerStarted, setTimerStarted] = useState(initialTimerStarted ?? false);
  const [prepCountdown, setPrepCountdown] = useState<number | null>(null);

  useImperativeHandle(ref, () => ({
    getTimerState: () => ({ countdown, started: timerStarted }),
  }), [countdown, timerStarted]);
  const [cardioMinutes, setCardioMinutes] = useState('');
  const [cardioDistance, setCardioDistance] = useState('');

  const adjustWeightSheetRef = useRef<BottomSheet>(null);
  const substituteSheetRef = useRef<BottomSheet>(null);

  function closeAllSheets() {
    skipExerciseSheetRef.current?.close();
    descriptionSheetRef.current?.close();
    adjustWeightSheetRef.current?.close();
    substituteSheetRef.current?.close();
  }
  const adjustSuccessTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adjustWeightSnapPoints = useMemo(() => ['45%'], []);
  const [adjustedWeight, setAdjustedWeight] = useState(set.weight ?? 0);
  const [adjustSuccess, setAdjustSuccess] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const weightStep = unitResolved === 'lbs' ? lbsToKg(5) : 2.5;

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

  useEffect(() => {
    if (prepCountdown === null) return;
    if (prepCountdown === 0) {
      setPrepCountdown(null);
      setTimerStarted(true);
      return;
    }
    Vibration.vibrate(40);
    const t = setTimeout(() => setPrepCountdown(c => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [prepCountdown]);

  useEffect(() => {
    return () => {
      if (adjustSuccessTimeout.current) clearTimeout(adjustSuccessTimeout.current);
    };
  }, []);

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

  function handleTimerPress() {
    if (timerDone) { handleDurationValidate(); return; }
    if (!timerStarted && prepCountdown === null) { setPrepCountdown(3); }
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

  async function handleWarmupValidate() {
    if (loading) return;
    setLoading(true);
    try {
      await onValidate({ repsDone: set.reps_min, weightDone: 0, rpe: null });
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

  const setLabel = set.set_type === 'amrap'
    ? (set.reps_min > 0 ? `${set.reps_min}+ rép` : 'MAX rép')
    : `${set.reps_min} rép`;
  const weightLabel = set.weight_type === 'bodyweight'
    ? 'Poids de corps'
    : set.weight_type === 'bar'
      ? 'barre'
      : set.weight != null
        ? `${convert(set.weight)} ${unitLabel}`
        : `— ${unitLabel}`;
  const timerLabel = timerDone ? 'TERMINÉ ✓' : timerStarted ? 'EN COURS…' : 'APPUYER ▶';
  const timerA11yLabel = timerDone ? "C'est fait — valider" : timerStarted ? `Temps restant : ${countdown} secondes` : 'Lancer le décompte';

  const currentSetIndex = block.sets.findIndex(s => s.id === set.id);
  const restSets = currentSetIndex >= 0 ? block.sets.slice(currentSetIndex + 1) : [];

  const repsFeedback = (set.set_type === 'amrap' && set.reps_min === 0)
    ? null
    : computeRepsFeedback(reps, set.reps_min, set.weight_type === 'bodyweight');

  const undoSwipe = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-30, 30])
        .failOffsetY([-15, 15])
        .onEnd((e) => {
          if (canUndo && e.translationX < SWIPE_UNDO_THRESHOLD) {
            onUndo();
          }
        }),
    [canUndo, onUndo],
  );

  return (
    <View style={styles.wrapper}>
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextGroup}>
            <View
              style={styles.exerciseNameRow}
              accessible={true}
              accessibilityLabel={isSubstituted ? `Exercice remplacé : ${exercise.exercise.name}` : exercise.exercise.name}
            >
              {isSubstituted && (
                <Ionicons
                  name="swap-horizontal-outline"
                  size={18}
                  color={colors.textSecondary}
                  importantForAccessibility="no-hide-descendants"
                />
              )}
              <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={1}>
                {exercise.exercise.name}
              </Text>
            </View>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>{progressLabel}</Text>
            <View style={styles.blockBadge}>
              <Text style={[styles.blockBadgeText, { color: colors.textSecondary }]}>{block.name.toUpperCase()}</Text>
            </View>
            {supersetPosition && (
              <View style={styles.supersetBadge}>
                <Text style={styles.supersetBadgeText}>
                  SUPERSET · {supersetPosition.current}/{supersetPosition.total}
                </Text>
              </View>
            )}
            {set.set_type === 'amrap' && (
              <View style={styles.amrapBadge}>
                <Text style={styles.amrapBadgeText}>AMRAP</Text>
              </View>
            )}
            {set.rest_duration === 0 && !isCardio && !isEtirement && (
              <View style={[styles.dropsetBadge, { borderColor: colors.textSecondary }]}>
                <Text style={[styles.dropsetBadgeText, { color: colors.textSecondary }]}>ENCHAÎNÉ</Text>
              </View>
            )}
            <GestureDetector gesture={undoSwipe}>
              <View
                accessible
                accessibilityLabel={`Série ${currentSetIndex + 1} sur ${block.sets.length}`}
              >
                <SeriesProgressBar done={currentSetIndex} total={block.sets.length} />
              </View>
            </GestureDetector>
            {lastSetLog && (
              <Text style={[styles.lastLog, { color: colors.textSecondary }]}>
                {formatLastLog(lastSetLog, isCardio, isDuration, convert, unitLabel)}
              </Text>
            )}
          </View>
          <View style={styles.headerActions}>
            {set.weight_type !== 'bodyweight' && onAdjustWeight && (
              <PressableA11y
                onPress={() => {
                  setAdjustedWeight(set.weight ?? 0);
                  closeAllSheets();
                  adjustWeightSheetRef.current?.expand();
                }}
                accessibilityLabel="Modifier le poids de travail pour les séries suivantes"
                style={styles.actionBtn}
              >
                <Ionicons name="barbell-outline" size={22} color={colors.textSecondary} />
              </PressableA11y>
            )}
            {!!exercise.exercise.description && (
              <PressableA11y
                onPress={() => { closeAllSheets(); descriptionSheetRef.current?.expand(); }}
                accessibilityLabel="Voir la description de l'exercice"
                style={styles.actionBtn}
              >
                <Ionicons name="help-circle-outline" size={22} color={colors.textSecondary} />
              </PressableA11y>
            )}
            {canUndo && (
              <PressableA11y
                onPress={onUndo}
                accessibilityLabel="Annuler la dernière série"
                style={styles.actionBtn}
              >
                <Ionicons name="arrow-undo-outline" size={22} color={colors.text} />
              </PressableA11y>
            )}
          </View>
        </View>
      </View>

      <View style={styles.body}>
      {isCardio ? (
        <>
          <View style={[styles.targetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.targetText, { color: colors.text }]}>Footing</Text>
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
            style={[styles.validateBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="checkmark" size={20} color={colors.onPrimary} />
            <Text style={[styles.validateBtnText, { color: colors.onPrimary }]}>{loading ? 'Validation…' : 'Valider le footing'}</Text>
          </PressableA11y>
        </>
      ) : isDuration ? (
        <>
          {prepCountdown !== null ? (
            <View style={[styles.circularTimerWrapper, styles.prepCountdownWrapper]}>
              <Text style={[styles.prepCountdownNumber, { color: colors.text }]}>{prepCountdown}</Text>
              <Text style={[styles.prepCountdownLabel, { color: colors.textSecondary }]}>PRÉPARE-TOI</Text>
            </View>
          ) : (
            <PressableA11y
              style={styles.circularTimerWrapper}
              accessibilityLabel={timerA11yLabel}
              onPress={handleTimerPress}
            >
              <CircularTimer
                progress={countdown / (set.duration_seconds ?? 1)}
                remaining={countdown}
                label={timerLabel}
                size={220}
              />
            </PressableA11y>
          )}

          {timerStarted && (
            <PressableA11y
              accessibilityLabel="C'est fait — valider cet exercice"
              onPress={handleDurationValidate}
              style={[styles.validateBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="checkmark" size={20} color={colors.onPrimary} />
              <Text style={[styles.validateBtnText, { color: colors.onPrimary }]}>{loading ? 'Validation…' : "C'est fait"}</Text>
            </PressableA11y>
          )}
        </>
      ) : isEtirement ? (
        <>
          <View style={[styles.targetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.targetText, { color: colors.text }]}>{setLabel}</Text>
          </View>
          <PressableA11y
            accessibilityLabel="Valider cet exercice"
            onPress={handleWarmupValidate}
            style={[styles.validateBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="checkmark" size={20} color={colors.onPrimary} />
            <Text style={[styles.validateBtnText, { color: colors.onPrimary }]}>{loading ? 'Validation…' : 'VALIDER'}</Text>
          </PressableA11y>
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
              {set.weight_type === 'fixed' && (
                <Text style={[styles.inputHint, { color: colors.textSecondary }]}>par haltère</Text>
              )}
            </View>
          </View>
          <View style={styles.rpeSection}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>RESSENTI (OPTIONNEL)</Text>
            <View style={styles.rpeRow}>
              {RPE_OPTIONS.map(opt => (
                <PressableA11y
                  key={opt.value}
                  accessibilityLabel={`Ressenti : ${opt.label}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: rpe === opt.value }}
                  onPress={() => setRpe(rpe === opt.value ? '' : opt.value)}
                  style={[
                    styles.rpeChip,
                    {
                      borderColor: colors.border,
                      backgroundColor: rpe === opt.value ? colors.primary : colors.surface,
                    },
                  ]}
                >
                  <Text style={[styles.rpeChipText, { color: rpe === opt.value ? colors.onPrimary : colors.text }]}>
                    {opt.label}
                  </Text>
                </PressableA11y>
              ))}
            </View>
          </View>

          <PressableA11y
            accessibilityLabel="Valider la série avec les valeurs saisies"
            onPress={handleValidate}
            style={[styles.validateBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="checkmark" size={20} color={colors.onPrimary} />
            <Text style={[styles.validateBtnText, { color: colors.onPrimary }]}>{loading ? 'Validation…' : 'VALIDER'}</Text>
          </PressableA11y>
          {repsFeedback !== null && (
            <Text
              style={[styles.repsFeedback, { color: colors.textSecondary }]}
              accessibilityLiveRegion="polite"
            >
              {repsFeedback}
            </Text>
          )}
        </>
      )}

      {/* Séries restantes */}
      {restSets.length > 0 && (
        <View style={styles.restSection}>
          <Text style={[styles.restLabel, { color: colors.textSecondary }]}>SÉRIES RESTANTES</Text>
          {restSets.map((s, i) => {
            const prevSet = block.sets[currentSetIndex + i];
            const isChained = prevSet?.rest_duration === 0;
            return (
              <Text key={s.id} style={[styles.restSet, { color: colors.textSecondary }]}>
                {i + currentSetIndex + 2} · {s.weight_type === 'bodyweight' ? 'Poids de corps' : s.weight != null ? `${convert(s.weight)} ${unitLabel}` : '—'} × {s.set_type === 'amrap' ? (s.reps_min > 0 ? `${s.reps_min}+` : 'MAX') : s.reps_min}{isChained ? ' ⚡' : ''}
              </Text>
            );
          })}
        </View>
      )}
      {adjustSuccess && (
        <Text style={[styles.adjustSuccessMsg, { color: colors.textSecondary }]}>
          Poids mis à jour pour les séries suivantes.
        </Text>
      )}
      </View>
    </ScrollView>

    <PressableA11y
      accessibilityLabel="Passer — ouvrir les options"
      onPress={() => { closeAllSheets(); skipExerciseSheetRef.current?.expand(); }}
      style={[styles.skipBtn, { borderTopColor: colors.border }]}
    >
      <Text style={[styles.skipText, { color: colors.textSecondary }]}>Passer →</Text>
    </PressableA11y>

    {prepCountdown !== null && (
      <View
        style={[styles.prepCountdownOverlay, { backgroundColor: colors.background }]}
        pointerEvents="none"
      >
        <Text style={[styles.prepCountdownNumber, { color: colors.text, width: '100%', textAlign: 'center' }]}>{prepCountdown}</Text>
        <Text style={[styles.prepCountdownLabel, { color: colors.textSecondary, width: '100%', textAlign: 'center' }]}>PRÉPARE-TOI</Text>
      </View>
    )}

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
          <PressableA11y
            accessibilityLabel="Passer cette série uniquement"
            onPress={() => {
              skipExerciseSheetRef.current?.close();
              onSkip();
            }}
            style={[styles.sheetCancelBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.sheetCancelText, { color: colors.text }]}>Passer cette série</Text>
          </PressableA11y>
          {onSubstituteExercise && (
            <PressableA11y
              accessibilityLabel="Remplacer cet exercice par un autre"
              onPress={() => {
                closeAllSheets();
                substituteSheetRef.current?.expand();
              }}
              style={[styles.sheetCancelBtn, { borderColor: colors.border }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, justifyContent: 'center' }}>
                <Ionicons name="swap-horizontal-outline" size={16} color={colors.text} />
                <Text style={[styles.sheetCancelText, { color: colors.text }]}>Remplacer cet exercice</Text>
              </View>
            </PressableA11y>
          )}
          <PressableA11y
            accessibilityLabel={supersetExerciseNames
              ? `Passer le superset entier : ${supersetExerciseNames.join(', ')}`
              : "Passer l'exercice entier — toutes les séries restantes"}
            onPress={() => {
              skipExerciseSheetRef.current?.close();
              onSkipExercise();
            }}
            style={[styles.sheetDestructiveBtn, { backgroundColor: SemanticColors.destructive }]}
          >
            <Text style={styles.sheetBtnText}>
              {supersetExerciseNames
                ? `Passer le superset entier (${supersetExerciseNames.join(' · ')})`
                : "Passer l’exercice entier"}
            </Text>
          </PressableA11y>
          {onFinish && (
            <PressableA11y
              accessibilityLabel="Finir la séance maintenant"
              onPress={() => {
                skipExerciseSheetRef.current?.close();
                Alert.alert(
                  'Finir la séance ?',
                  'La séance sera complétée avec les séries déjà validées.',
                  [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Terminer', style: 'destructive', onPress: onFinish },
                  ],
                );
              }}
              style={[styles.sheetCancelBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.sheetCancelText, { color: colors.textSecondary }]}>Finir la séance</Text>
            </PressableA11y>
          )}
          <PressableA11y
            accessibilityLabel="Annuler"
            onPress={() => skipExerciseSheetRef.current?.close()}
            style={[styles.sheetCancelBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.sheetCancelText, { color: colors.text }]}>Annuler</Text>
          </PressableA11y>
        </BottomSheetView>
      </BottomSheet>

      <BottomSheet
        ref={descriptionSheetRef}
        index={-1}
        snapPoints={descriptionSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetScrollView contentContainerStyle={styles.descriptionScrollContent}>
          <Text style={[styles.sheetTitle, { color: colors.text, marginBottom: Spacing.md }]} numberOfLines={2}>
            {exercise.exercise.name}
          </Text>
          <Text style={[styles.descriptionText, { color: colors.text }]}>
            {exercise.exercise.description}
          </Text>
        </BottomSheetScrollView>
      </BottomSheet>

      <BottomSheet
        ref={adjustWeightSheetRef}
        index={-1}
        snapPoints={adjustWeightSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetView style={styles.sheetContainer}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Modifier le poids</Text>
          <View style={styles.stepperRow}>
            <PressableA11y
              accessibilityLabel={`Diminuer de ${unitResolved === 'lbs' ? '5 lbs' : '2,5 kg'}`}
              onPress={() => setAdjustedWeight(w => Math.max(0, parseFloat((w - weightStep).toFixed(2))))}
              style={[styles.stepperBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Text style={[styles.stepperBtnText, { color: colors.text }]}>−</Text>
            </PressableA11y>
            <View
              style={styles.stepperValue}
              accessible
              accessibilityValue={{ text: `${convert(adjustedWeight)} ${unitLabel}` }}
            >
              <Text style={[styles.stepperValueText, { color: colors.text }]}>
                {convert(adjustedWeight)} {unitLabel}
              </Text>
            </View>
            <PressableA11y
              accessibilityLabel={`Augmenter de ${unitResolved === 'lbs' ? '5 lbs' : '2,5 kg'}`}
              onPress={() => setAdjustedWeight(w => parseFloat((w + weightStep).toFixed(2)))}
              style={[styles.stepperBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Text style={[styles.stepperBtnText, { color: colors.text }]}>+</Text>
            </PressableA11y>
          </View>
          <PressableA11y
            accessibilityLabel="Confirmer le nouveau poids"
            onPress={async () => {
              if (!onAdjustWeight || adjusting) return;
              setAdjusting(true);
              try {
                await onAdjustWeight(adjustedWeight);
                adjustWeightSheetRef.current?.close();
                setAdjustSuccess(true);
                if (adjustSuccessTimeout.current) clearTimeout(adjustSuccessTimeout.current);
                adjustSuccessTimeout.current = setTimeout(() => setAdjustSuccess(false), 2000);
              } finally {
                setAdjusting(false);
              }
            }}
            style={[styles.validateBtn, { backgroundColor: colors.primary, opacity: adjusting ? 0.5 : 1 }]}
            disabled={adjusting}
          >
            <Text style={[styles.validateBtnText, { color: colors.onPrimary }]}>Confirmer</Text>
          </PressableA11y>
          <PressableA11y
            accessibilityLabel="Annuler la modification de poids"
            onPress={() => adjustWeightSheetRef.current?.close()}
            style={[styles.sheetCancelBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.sheetCancelText, { color: colors.text }]}>Annuler</Text>
          </PressableA11y>
        </BottomSheetView>
      </BottomSheet>

      {onSubstituteExercise && (
        <SubstituteSheet
          sheetRef={substituteSheetRef}
          currentMuscleGroups={parseMuscleGroups(exercise.exercise.muscle_groups)}
          onSelect={onSubstituteExercise}
          onClose={() => substituteSheetRef.current?.close()}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flexGrow: 1, padding: Spacing.xl },
  header: { gap: 2 },
  body: { flex: 1, justifyContent: 'center', gap: Spacing.lg, paddingTop: Spacing.xl },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerTextGroup: { flex: 1, gap: 2, marginTop: Spacing.lg },
  headerActions: { gap: Spacing.xs, marginTop: Spacing.lg },
  actionBtn: { padding: Spacing.md },
  exerciseNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  exerciseName: { fontSize: 26, fontFamily: FontFamily.bold },
  progressLabel: { fontSize: 13 },
  circularTimerWrapper: { alignItems: 'center' },
  prepCountdownWrapper: { justifyContent: 'center', width: 220, height: 220 },
  prepCountdownOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  prepCountdownNumber: { fontSize: 96, fontFamily: FontFamily.black, textAlign: 'center', lineHeight: 110 },
  prepCountdownLabel: { fontSize: 11, fontFamily: FontFamily.bold, letterSpacing: LetterSpacing.widest, textAlign: 'center' },
  blockBadge: { alignSelf: 'flex-start', marginTop: Spacing.xs },
  blockBadgeText: { fontSize: 11, fontFamily: FontFamily.bold, letterSpacing: LetterSpacing.wide },
  targetCard: { padding: Spacing.lg, borderRadius: Radius.sm, borderWidth: 1, alignItems: 'center' },
  targetText: { fontSize: 20, fontFamily: FontFamily.semibold },
  inputRow: { flexDirection: 'row', gap: Spacing.md },
  inputGroup: { flex: 1, gap: Spacing.xs },
  inputGroupDisabled: { opacity: 0.4 },
  inputLabel: { fontSize: 11, fontFamily: FontFamily.medium, textAlign: 'center' },
  inputHint: { fontSize: 10, textAlign: 'center', marginBottom: 2 },
  input: { borderWidth: 1, borderRadius: Radius.sm, padding: Spacing.md, fontSize: 18, fontFamily: FontFamily.semibold, textAlign: 'center' },
  validateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, minHeight: 64, borderRadius: Radius.sm,
  },
  validateBtnText: { fontSize: 15, fontFamily: FontFamily.bold, letterSpacing: LetterSpacing.max, textTransform: 'uppercase' },
  repsFeedback: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  lastLog: { fontSize: 12, marginTop: Spacing.xs },
  restSection: { gap: Spacing.xs },
  restLabel: { fontSize: 10, fontFamily: FontFamily.semibold, letterSpacing: LetterSpacing.wide },
  restSet: { fontSize: 13, lineHeight: 20 },
  skipBtn: { alignItems: 'center', paddingVertical: Spacing.lg, borderTopWidth: 1 },
  skipText: { fontSize: 14 },
  sheetContainer: { paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.sm, gap: Spacing.md },
  sheetTitle: { fontSize: 17, fontFamily: FontFamily.semibold },
  sheetMessage: { fontSize: 15 },
  sheetDestructiveBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.lg, borderRadius: Radius.lg },
  sheetBtnText: { color: '#fff', fontSize: 16, fontFamily: FontFamily.semibold },
  sheetCancelBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1 },
  sheetCancelText: { fontSize: 16, fontFamily: FontFamily.medium },
  descriptionScrollContent: { paddingHorizontal: Spacing.xxl, paddingBottom: 40 },
  descriptionText: { fontSize: 15, lineHeight: 24 },
  rpeSection: { gap: Spacing.sm },
  rpeRow: { flexDirection: 'row', gap: Spacing.sm },
  rpeChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    minHeight: 44,
  },
  rpeChipText: { fontSize: 14, fontFamily: FontFamily.medium },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, justifyContent: 'center' },
  stepperBtn: {
    width: 52,
    height: 52,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: { fontSize: 28, fontFamily: FontFamily.regular, lineHeight: 34 },
  stepperValue: { flex: 1, alignItems: 'center' },
  stepperValueText: { fontSize: 22, fontFamily: FontFamily.semibold },
  adjustSuccessMsg: { fontSize: 13, textAlign: 'center' },
  supersetBadge: {
    alignSelf: 'flex-start',
    marginTop: 2,
    backgroundColor: SemanticColors.superset,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  supersetBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    color: '#fff',
    letterSpacing: LetterSpacing.wide,
  },
  amrapBadge: {
    alignSelf: 'flex-start',
    marginTop: 2,
    backgroundColor: SemanticColors.cardio,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  amrapBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    color: '#000',
    letterSpacing: LetterSpacing.wide,
  },
  dropsetBadge: {
    alignSelf: 'flex-start',
    marginTop: 2,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  dropsetBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    letterSpacing: LetterSpacing.wide,
  },
});
