import { Spacing } from '@/constants/Spacing';
import { View, Text, StyleSheet } from 'react-native';
import { LetterSpacing, FontFamily} from '@/constants/Typography';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { ExerciseHistory } from '@/services/HistoryService';
import { Radius } from '@/constants/Radius';
import { useUnits } from '@/hooks/useUnits';

interface ExerciseHistorySectionProps {
  exercise: ExerciseHistory;
}

export function ExerciseHistorySection({ exercise }: ExerciseHistorySectionProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { convert, label: unitLabel } = useUnits();

  return (
    <View style={styles.container}>
      <Text
        style={[styles.exerciseName, { color: colors.textSecondary }]}
        accessibilityRole="header"
      >
        {exercise.exerciseName}
      </Text>
      <View style={styles.chips}>
        {exercise.sets.map((set, i) => {
          const label = set.rpe != null
            ? `${convert(set.weightDone)} ${unitLabel} × ${set.repsDone} · RPE ${set.rpe}`
            : `${convert(set.weightDone)} ${unitLabel} × ${set.repsDone}`;
          return (
            <View
              key={`${exercise.exerciseId}-${i}`}
              style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
              accessibilityLabel={label}
            >
              <Text style={[styles.chipText, { color: colors.text }]}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  exerciseName: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: LetterSpacing.wider,
    marginBottom: Spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 13,
  },
});
