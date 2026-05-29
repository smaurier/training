import { View, Text, StyleSheet } from 'react-native';
import { Exercise } from '@/db/types';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

interface ExerciseCardProps {
  exercise: Exercise;
}

export function ExerciseCard({ exercise }: ExerciseCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  let muscleGroups: string[] = [];
  try {
    muscleGroups = JSON.parse(exercise.muscle_groups || '[]');
  } catch {
    muscleGroups = [];
  }

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessibilityLabel={`Exercice ${exercise.name}`}
    >
      <View style={styles.row}>
        <Text style={[styles.name, { color: colors.text }]}>{exercise.name}</Text>
        <Text style={[styles.badge, { color: colors.primary }]}>{exercise.type}</Text>
      </View>
      {muscleGroups.length > 0 && (
        <Text style={[styles.muscles, { color: colors.textSecondary }]}>
          {muscleGroups.join(' · ')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginBottom: 10,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  muscles: {
    fontSize: 13,
  },
});
