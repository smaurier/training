import { View, Text, StyleSheet } from 'react-native';
import type { BlockWithSets } from '@/services/WorkoutExerciseService';
import type { Set as TrainingSet } from '@/db/types';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface BlockCardProps {
  block: BlockWithSets;
}

function formatSet(set: TrainingSet): string {
  const reps = set.reps_min === set.reps_max
    ? `${set.reps_min} rép`
    : `${set.reps_min}–${set.reps_max} rép`;

  let weight: string;
  if (set.weight_type === 'bodyweight') weight = 'PC';
  else if (set.weight_type === 'bar') weight = 'barre';
  else weight = set.weight != null ? `${set.weight} kg` : '— kg';

  const rest = set.rest_duration >= 60
    ? `${Math.round(set.rest_duration / 60)} min`
    : `${set.rest_duration} s`;

  return `${reps} @ ${weight} — ${rest}`;
}

export function BlockCard({ block }: BlockCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.container}>
      <Text style={[styles.blockName, { color: colors.textSecondary }]}>{block.name}</Text>
      {block.sets.length === 0 ? (
        <Text style={[styles.set, { color: colors.textSecondary }]}>Aucune série.</Text>
      ) : (
        block.sets.map((set) => (
          <Text key={set.id} style={[styles.set, { color: colors.text }]}>
            {formatSet(set)}
          </Text>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4, paddingVertical: 8 },
  blockName: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  set: { fontSize: 14, lineHeight: 20 },
});
