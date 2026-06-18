import { Spacing } from '@/constants/Spacing';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LetterSpacing } from '@/constants/Typography';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Exercise } from '@/db/types';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import { SemanticColors } from '@/constants/SemanticColors';

interface ExerciseCardProps {
  exercise: Exercise;
  onDelete?: (id: number) => void;
}

export function ExerciseCard({ exercise, onDelete }: ExerciseCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  let muscleGroups: string[] = [];
  try {
    muscleGroups = JSON.parse(exercise.muscle_groups || '[]');
  } catch {
    muscleGroups = [];
  }

  function renderRightActions() {
    if (!onDelete) return null;
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => onDelete(exercise.id)}
        accessibilityLabel={`Supprimer l'exercice ${exercise.name}`}
        accessibilityRole="button"
      >
        <Ionicons name="trash-outline" size={22} color="#fff" />
      </TouchableOpacity>
    );
  }

  return (
    <Swipeable renderRightActions={onDelete ? renderRightActions : undefined} overshootRight={false}>
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
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
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
    letterSpacing: LetterSpacing.wide,
  },
  muscles: {
    fontSize: 13,
  },
  deleteAction: {
    backgroundColor: SemanticColors.destructive,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },
});
