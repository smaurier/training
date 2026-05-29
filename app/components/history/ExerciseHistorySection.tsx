import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { ExerciseHistory } from '@/services/HistoryService';

interface ExerciseHistorySectionProps {
  exercise: ExerciseHistory;
}

export function ExerciseHistorySection({ exercise }: ExerciseHistorySectionProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

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
            ? `${set.weightDone} kg × ${set.repsDone} · RPE ${set.rpe}`
            : `${set.weightDone} kg × ${set.repsDone}`;
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
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  exerciseName: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 13,
  },
});
