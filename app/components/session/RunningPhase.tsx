// app/components/session/RunningPhase.tsx
import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableA11y } from '@/components/ui/PressableA11y';
import type { WorkoutExerciseDetail, BlockWithSets } from '@/services/WorkoutExerciseService';
import type { Set as TrainingSet } from '@/db/types';
import type { SetActual } from '@/services/SessionService';
import type { UseTimerResult } from '@/hooks/useTimer';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

interface RunningPhaseProps {
  exercise: WorkoutExerciseDetail;
  block: BlockWithSets;
  set: TrainingSet;
  progressLabel: string;
  timer: UseTimerResult;
  onValidate: (actual: SetActual) => Promise<void>;
  onSkip: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function RunningPhase({ exercise, block, set, progressLabel, timer, onValidate, onSkip }: RunningPhaseProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [reps, setReps] = useState(String(set.reps_max));
  const [weight, setWeight] = useState(set.weight != null ? String(set.weight) : '0');
  const [rpe, setRpe] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset inputs when set changes
  const setKey = set.id;

  async function handleValidate() {
    if (loading) return;
    setLoading(true);
    try {
      await onValidate({
        repsDone: parseInt(reps, 10) || 0,
        weightDone: parseFloat(weight) || 0,
        rpe: rpe.trim() ? parseInt(rpe, 10) : null,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleToutReussi() {
    if (loading) return;
    setLoading(true);
    try {
      await onValidate({
        repsDone: set.reps_max,
        weightDone: set.weight ?? 0,
        rpe: null,
      });
    } finally {
      setLoading(false);
    }
  }

  const setLabel = set.reps_min === set.reps_max
    ? `${set.reps_min} rép`
    : `${set.reps_min}–${set.reps_max} rép`;
  const weightLabel = set.weight_type === 'bodyweight' ? 'PC' : set.weight_type === 'bar' ? 'barre' : `${set.weight ?? '—'} kg`;
  const restSets = block.sets.slice(block.sets.findIndex(s => s.id === set.id) + 1);

  return (
    <ScrollView
      key={setKey}
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={1}>
          {exercise.exercise.name}
        </Text>
        <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>{progressLabel}</Text>
        <View style={styles.blockBadge}>
          <Text style={[styles.blockBadgeText, { color: colors.primary }]}>{block.name.toUpperCase()}</Text>
        </View>
      </View>

      {/* Cible */}
      <View style={[styles.targetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.targetText, { color: colors.text }]}>{weightLabel} × {setLabel}</Text>
      </View>

      {/* Timer */}
      <PressableA11y
        accessibilityLabel={timer.isRunning ? 'Pause du chrono' : 'Reprendre le chrono'}
        onPress={timer.isRunning ? timer.pause : timer.start}
        style={[styles.timerContainer, { backgroundColor: timer.isRunning ? colors.primary + '15' : colors.surface, borderColor: timer.isRunning ? colors.primary : colors.border }]}
      >
        <Text style={[styles.timerText, { color: timer.isRunning ? colors.primary : colors.textSecondary }]}>
          {formatTime(timer.remaining)}
        </Text>
        <Text style={[styles.timerLabel, { color: colors.textSecondary }]}>
          {timer.isRunning ? 'PAUSE — tap pour stopper' : 'CHRONO — tap pour lancer'}
        </Text>
      </PressableA11y>

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
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Poids (kg)</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
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

      {/* Boutons */}
      <PressableA11y
        accessibilityLabel="Valider la série"
        onPress={handleValidate}
        style={[styles.validateBtn, { backgroundColor: '#16a34a' }]}
      >
        <Ionicons name="checkmark" size={20} color="#fff" />
        <Text style={styles.validateBtnText}>{loading ? 'Validation…' : 'Valider'}</Text>
      </PressableA11y>

      <PressableA11y
        accessibilityLabel="Tout réussi — valider avec les valeurs cibles"
        onPress={handleToutReussi}
        style={[styles.toutReussiBtn, { borderColor: colors.primary }]}
      >
        <Text style={[styles.toutReussiBtnText, { color: colors.primary }]}>Tout réussi ⚡</Text>
      </PressableA11y>

      {/* Séries restantes */}
      {restSets.length > 0 && (
        <View style={styles.restSection}>
          <Text style={[styles.restLabel, { color: colors.textSecondary }]}>SÉRIES RESTANTES</Text>
          {restSets.map((s, i) => (
            <Text key={s.id} style={[styles.restSet, { color: colors.textSecondary }]}>
              {i + block.sets.findIndex(bs => bs.id === set.id) + 2} · {s.weight != null ? `${s.weight} kg` : 'PC'} × {s.reps_min === s.reps_max ? s.reps_min : `${s.reps_min}–${s.reps_max}`}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, gap: 14 },
  header: { gap: 2, marginTop: 16 },
  exerciseName: { fontSize: 22, fontWeight: '700' },
  progressLabel: { fontSize: 13 },
  blockBadge: { alignSelf: 'flex-start', marginTop: 4 },
  blockBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  targetCard: { padding: 16, borderRadius: Radius.sm, borderWidth: 1, alignItems: 'center' },
  targetText: { fontSize: 20, fontWeight: '600' },
  timerContainer: { borderRadius: Radius.sm, borderWidth: 1.5, padding: 20, alignItems: 'center', gap: 4 },
  timerText: { fontSize: 52, fontWeight: '700', letterSpacing: -1 },
  timerLabel: { fontSize: 11, fontWeight: '500', letterSpacing: 0.3 },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputGroup: { flex: 1, gap: 4 },
  inputLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  inputHint: { fontSize: 10, textAlign: 'center', marginBottom: 2 },
  input: { borderWidth: 1, borderRadius: Radius.sm, padding: 10, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  validateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: Radius.sm },
  validateBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  toutReussiBtn: { borderWidth: 1.5, borderRadius: Radius.sm, paddingVertical: 12, alignItems: 'center' },
  toutReussiBtnText: { fontSize: 15, fontWeight: '600' },
  restSection: { gap: 4 },
  restLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  restSet: { fontSize: 13, lineHeight: 20 },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 14 },
});
