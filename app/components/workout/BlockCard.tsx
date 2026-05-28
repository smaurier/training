import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import type { BlockWithSets } from '@/services/WorkoutExerciseService';
import type { Set as TrainingSet } from '@/db/types';
import type { UpdateSetDto } from '@/repositories/ISetRepository';
import { EditSetModal } from './EditSetModal';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface BlockCardProps {
  block: BlockWithSets;
  onUpdateSet: (setId: number, dto: UpdateSetDto) => Promise<void>;
  onAddSet: (blockId: number) => Promise<void>;
  onRemoveSet: (setId: number) => Promise<void>;
  onRenameBlock: (block: BlockWithSets) => void;
  onRemoveBlock: (blockId: number) => Promise<void>;
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

export function BlockCard({ block, onUpdateSet, onAddSet, onRemoveSet, onRenameBlock, onRemoveBlock }: BlockCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [editingSet, setEditingSet] = useState<TrainingSet | null>(null);

  function handleBlockLongPress() {
    Alert.alert(block.name, 'Que veux-tu faire ?', [
      {
        text: 'Renommer',
        onPress: () => onRenameBlock(block),
      },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => Alert.alert(
          'Supprimer le bloc',
          `Supprimer "${block.name}" et toutes ses séries ?`,
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Supprimer', style: 'destructive', onPress: () => onRemoveBlock(block.id) },
          ]
        ),
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  function handleSetLongPress(set: TrainingSet) {
    Alert.alert(
      'Supprimer cette série ?',
      formatSet(set),
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => onRemoveSet(set.id) },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <PressableA11y
        accessibilityLabel={`${block.name}, appuyer longuement pour modifier`}
        accessibilityHint="Appuyer longuement pour renommer ou supprimer"
        onPress={() => {}}
        onLongPress={handleBlockLongPress}
      >
        <Text style={[styles.blockName, { color: colors.textSecondary }]}>{block.name}</Text>
      </PressableA11y>

      {block.sets.length === 0 ? (
        <Text style={[styles.set, { color: colors.textSecondary }]}>Aucune série.</Text>
      ) : (
        block.sets.map((set) => (
          <PressableA11y
            key={set.id}
            accessibilityLabel={`${formatSet(set)}, appuyer pour modifier`}
            accessibilityHint="Appuyer longuement pour supprimer"
            onPress={() => setEditingSet(set)}
            onLongPress={() => handleSetLongPress(set)}
          >
            <Text style={[styles.set, { color: colors.text }]}>
              {formatSet(set)}
            </Text>
          </PressableA11y>
        ))
      )}

      <PressableA11y
        accessibilityLabel="Ajouter une série"
        onPress={() => onAddSet(block.id)}
        style={styles.addBtn}
      >
        <Text style={[styles.addBtnText, { color: colors.primary }]}>+ Ajouter une série</Text>
      </PressableA11y>

      {editingSet && (
        <EditSetModal
          set={editingSet}
          onSave={async (dto) => {
            const setId = editingSet.id;
            await onUpdateSet(setId, dto);
          }}
          onClose={() => setEditingSet(null)}
        />
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
  set: { fontSize: 14, lineHeight: 20, paddingVertical: 2 },
  addBtn: { marginTop: 4 },
  addBtnText: { fontSize: 13, fontWeight: '500' },
});
