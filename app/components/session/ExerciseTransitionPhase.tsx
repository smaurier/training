import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import type { WorkoutExerciseDetail } from '@/services/WorkoutExerciseService';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import { SemanticColors } from '@/constants/SemanticColors';

interface ExerciseTransitionPhaseProps {
  exercise: WorkoutExerciseDetail;
  exerciseNumber: number;
  totalExercises: number;
  onContinue: () => void;
  supersetGroup?: string[];
}

function getTypeColor(type: string, primaryColor: string): string {
  if (type === 'etirement') return SemanticColors.stretch;
  if (type === 'cardio') return SemanticColors.cardio;
  return primaryColor;
}

function getWorkSummary(exercise: WorkoutExerciseDetail): string {
  if (exercise.exercise.type === 'cardio') return 'Cardio';
  const travail = exercise.blocks.find(b => b.is_work_block === 1 && b.name === 'Travail');
  if (travail && travail.sets.length > 0) {
    const s = travail.sets[0];
    const repsLabel = `${s.reps_min} reps`;
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
  supersetGroup,
}: ExerciseTransitionPhaseProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const typeColor = getTypeColor(exercise.exercise.type, colors.primary);
  const onTypeColor = typeColor === colors.primary ? colors.onPrimary : '#fff';
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

        {supersetGroup && supersetGroup.length > 1 && (
          <View style={[styles.supersetPreview, { backgroundColor: SemanticColors.supersetAlpha, borderColor: SemanticColors.superset, borderWidth: 1, borderRadius: 8, padding: 12 }]}>
            <Text style={[styles.supersetPreviewLabel, { color: SemanticColors.superset }]}>
              {'Tu vas enchaîner :'}
            </Text>
            <Text style={[styles.supersetPreviewChain, { color: colors.text }]}>
              {supersetGroup.join(' → ')}
              {' · repos après '}
              {supersetGroup[supersetGroup.length - 1]}
            </Text>
          </View>
        )}

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
          <Text style={[styles.continueBtnText, { color: onTypeColor }]}>C&apos;est parti →</Text>
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
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.5,
  },
  exerciseName: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
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
  supersetPreview: { marginTop: 4 },
  supersetPreviewLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 0.5, marginBottom: 4 },
  supersetPreviewChain: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  continueBtn: {
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
    marginTop: 24,
  },
  continueBtnText: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
  },
});
