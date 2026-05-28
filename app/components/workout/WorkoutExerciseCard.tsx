import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WorkoutExerciseDetail } from '@/services/WorkoutExerciseService';
import { BlockCard } from './BlockCard';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface WorkoutExerciseCardProps {
  detail: WorkoutExerciseDetail;
  onRemove: () => void;
}

export function WorkoutExerciseCard({ detail, onRemove }: WorkoutExerciseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  function handleLongPress() {
    Alert.alert(detail.exercise.name, 'Que veux-tu faire ?', [
      { text: 'Supprimer', style: 'destructive', onPress: onRemove },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  const parsedMuscles = detail.exercise.muscle_groups
    ? JSON.parse(detail.exercise.muscle_groups)
    : [];
  const muscleGroups = Array.isArray(parsedMuscles) ? parsedMuscles.join(', ') : '';

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <PressableA11y
        accessibilityLabel={`${detail.exercise.name}, ${expanded ? 'réduire' : 'développer'}`}
        accessibilityHint="Appuyer longuement pour supprimer"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(e => !e)}
        onLongPress={handleLongPress}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {detail.exercise.name}
          </Text>
          {muscleGroups ? (
            <Text style={[styles.muscles, { color: colors.textSecondary }]} numberOfLines={1}>
              {muscleGroups}
            </Text>
          ) : null}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
          importantForAccessibility="no"
          accessibilityElementsHidden={true}
        />
      </PressableA11y>
      {expanded && (
        <View style={styles.blocks}>
          {detail.blocks.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>Aucun bloc configuré.</Text>
          ) : (
            detail.blocks.map(block => (
              <BlockCard key={block.id} block={block} />
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8, minHeight: 56 },
  headerContent: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '600' },
  muscles: { fontSize: 12 },
  blocks: { padding: 12, paddingTop: 0, gap: 8 },
  empty: { fontSize: 13, fontStyle: 'italic', paddingVertical: 4 },
});
