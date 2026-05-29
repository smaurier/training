import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => Promise<void>;
  onMoveDown: () => Promise<void>;
  onReorderSet: (setId: number, direction: 'up' | 'down') => Promise<void>;
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

export function BlockCard({ block, onUpdateSet, onAddSet, onRemoveSet, onRenameBlock, onRemoveBlock, isFirst, isLast, onMoveUp, onMoveDown, onReorderSet }: BlockCardProps) {
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
      <View style={styles.blockHeader}>
        <PressableA11y
          accessibilityLabel={`${block.name}, appuyer longuement pour modifier`}
          accessibilityHint="Appuyer longuement pour renommer ou supprimer"
          onPress={() => {}}
          onLongPress={handleBlockLongPress}
          style={styles.blockNamePressable}
        >
          <Text style={[styles.blockName, { color: colors.textSecondary }]}>{block.name}</Text>
        </PressableA11y>
        {!isFirst && (
          <PressableA11y
            accessibilityLabel={`Monter le bloc ${block.name}`}
            onPress={onMoveUp}
            style={styles.reorderBtn}
          >
            <Ionicons name="chevron-up-outline" size={14} color={colors.textSecondary} />
          </PressableA11y>
        )}
        {!isLast && (
          <PressableA11y
            accessibilityLabel={`Descendre le bloc ${block.name}`}
            onPress={onMoveDown}
            style={styles.reorderBtn}
          >
            <Ionicons name="chevron-down-outline" size={14} color={colors.textSecondary} />
          </PressableA11y>
        )}
      </View>

      {block.sets.length === 0 ? (
        <Text style={[styles.set, { color: colors.textSecondary }]}>Aucune série.</Text>
      ) : (
        block.sets.map((set, index) => (
          <View key={set.id} style={styles.setRow}>
            <PressableA11y
              accessibilityLabel={`${formatSet(set)}, appuyer pour modifier`}
              accessibilityHint="Appuyer longuement pour supprimer"
              onPress={() => setEditingSet(set)}
              onLongPress={() => handleSetLongPress(set)}
              style={styles.setMain}
            >
              <Text style={[styles.set, { color: colors.text }]}>
                {formatSet(set)}
              </Text>
            </PressableA11y>
            {index > 0 && (
              <PressableA11y
                accessibilityLabel={`Monter série ${index + 1}`}
                onPress={() => onReorderSet(set.id, 'up')}
                style={styles.reorderBtn}
              >
                <Ionicons name="chevron-up-outline" size={14} color={colors.textSecondary} />
              </PressableA11y>
            )}
            {index < block.sets.length - 1 && (
              <PressableA11y
                accessibilityLabel={`Descendre série ${index + 1}`}
                onPress={() => onReorderSet(set.id, 'down')}
                style={styles.reorderBtn}
              >
                <Ionicons name="chevron-down-outline" size={14} color={colors.textSecondary} />
              </PressableA11y>
            )}
          </View>
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
  blockHeader: { flexDirection: 'row', alignItems: 'center' },
  blockNamePressable: { flex: 1 },
  blockName: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  setRow: { flexDirection: 'row', alignItems: 'center' },
  setMain: { flex: 1 },
  set: { fontSize: 14, lineHeight: 20, paddingVertical: 2 },
  reorderBtn: { alignItems: 'center', justifyContent: 'center' },
  addBtn: { marginTop: 4 },
  addBtnText: { fontSize: 13, fontWeight: '500' },
});
