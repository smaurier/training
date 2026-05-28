import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Workout } from '@/db/types';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface WorkoutCardProps {
  workout: Workout;
  onPress: () => void;
  onLongPress: () => void;
}

export function WorkoutCard({ workout, onPress, onLongPress }: WorkoutCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`Séance ${workout.name}`}
      accessibilityHint="Appuie pour configurer les exercices, maintiens pour modifier ou supprimer"
    >
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
        {workout.name}
      </Text>
      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        0 exercice
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 4,
    minHeight: 44,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
});
