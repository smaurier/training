import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import type { WorkoutExerciseDetail } from '@/services/WorkoutExerciseService';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

interface ExerciseTransitionPhaseProps {
  exercise: WorkoutExerciseDetail;
  exerciseNumber: number;
  totalExercises: number;
  onContinue: () => void;
}

function getTypeColor(type: string, primaryColor: string): string {
  if (type === 'etirement') return '#16a34a';
  if (type === 'cardio') return '#ea580c';
  return primaryColor;
}

function getWorkSummary(exercise: WorkoutExerciseDetail): string {
  if (exercise.exercise.type === 'cardio') return 'Cardio';
  const travail = exercise.blocks.find(b => b.is_work_block === 1 && b.name === 'Travail');
  if (travail && travail.sets.length > 0) {
    const s = travail.sets[0];
    const repsLabel =
      s.reps_min === s.reps_max ? `${s.reps_min} reps` : `${s.reps_min}–${s.reps_max} reps`;
    return `${travail.sets.length} série${travail.sets.length > 1 ? 's' : ''} × ${repsLabel} — ${s.rest_duration}s repos`;
  }
  const firstSet = exercise.blocks[0]?.sets[0];
  if (firstSet?.duration_seconds) {
    const m = Math.floor(firstSet.duration_seconds / 60);
    const s = firstSet.duration_seconds % 60;
    return m > 0 ? `${m}min${s > 0 ? ` ${s}s` : ''}` : `${s}s`;
  }
  return '';
}

export function ExerciseTransitionPhase({
  exercise,
  exerciseNumber,
  totalExercises,
  onContinue,
}: ExerciseTransitionPhaseProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const typeColor = getTypeColor(exercise.exercise.type, colors.primary);
  const workSummary = getWorkSummary(exercise);
  const description = exercise.exercise.description;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Color stripe */}
      <View style={[styles.stripe, { backgroundColor: typeColor }]} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.exerciseLabel, { color: colors.textSecondary }]}>
          {`EXERCICE ${exerciseNumber}/${totalExercises}`}
        </Text>

        <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={2}>
          {exercise.exercise.name}
        </Text>

        {workSummary ? (
          <Text style={[styles.workSummary, { color: colors.textSecondary }]}>
            {workSummary}
          </Text>
        ) : null}

        {description ? (
          <>
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <Text style={[styles.description, { color: colors.text }]}>{description}</Text>
          </>
        ) : null}

        <PressableA11y
          accessibilityLabel={`Commencer l'exercice ${exercise.exercise.name}`}
          onPress={onContinue}
          style={[styles.continueBtn, { backgroundColor: typeColor }]}
        >
          <Text style={styles.continueBtnText}>C'est parti →</Text>
        </PressableA11y>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  stripe: {
    width: 4,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    gap: 12,
  },
  exerciseLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  exerciseName: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  workSummary: {
    fontSize: 15,
  },
  separator: {
    height: 1,
    marginVertical: 4,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  continueBtn: {
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
    marginTop: 24,
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
