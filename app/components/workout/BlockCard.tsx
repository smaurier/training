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
import { Radius } from '@/constants/Radius';

interface BlockCardProps {
  block: BlockWithSets;
  isFirst: boolean;
  isLast: boolean;
  onUpdateSet: (setId: number, dto: UpdateSetDto) => Promise<void>;
  onAddSet: (blockId: number) => Promise<void>;
  onRemoveSet: (setId: number) => Promise<void>;
  onRenameBlock: (block: BlockWithSets) => void;
  onRemoveBlock: (blockId: number) => Promise<void>;
  onMoveUp: () => Promise<void>;
  onMoveDown: () => Promise<void>;
}

function formatSet(set: TrainingSet): string {
  const reps = `${set.reps_min} rép`;

  let weight: string;
  if (set.weight_type === 'bodyweight') weight = 'PC';
  else if (set.weight_type === 'bar') weight = 'barre';
  else weight = set.weight != null ? `${set.weight} kg` : '— kg';

  const rest = set.rest_duration >= 60
    ? `${Math.round(set.rest_duration / 60)} min`
    : `${set.rest_duration} s`;

  return `${reps} @ ${weight} — ${rest}`;
}

export function BlockCard({ block, isFirst, isLast, onUpdateSet, onAddSet, onRemoveSet, onRenameBlock, onRemoveBlock, onMoveUp, onMoveDown }: BlockCardProps) {
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
    <View style={[styles.container, !isFirst && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
      <View style={styles.blockHeader}>
        <PressableA11y
          accessibilityLabel={`${block.name}, appuyer longuement pour modifier`}
          accessibilityHint="Appuyer longuement pour renommer ou supprimer"
          onPress={() => {}}
          onLongPress={handleBlockLongPress}
          style={styles.blockNamePressable}
        >
          <View style={styles.blockNameRow}>
            <Text style={[styles.blockName, { color: colors.textSecondary }]}>{block.name}</Text>
            <View style={[
              styles.badge,
              block.is_work_block === 1
                ? { backgroundColor: colors.primary + '20' }
                : { backgroundColor: colors.border },
            ]}>
              <Text style={[
                styles.badgeText,
                { color: block.is_work_block === 1 ? colors.primary : colors.textSecondary },
              ]}>
                {block.is_work_block === 1 ? 'TRAVAIL' : 'REPOS'}
              </Text>
            </View>
          </View>
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
  blockHeader: { flexDirection: 'row', alignItems: 'center' },
  blockNamePressable: { flex: 1 },
  blockNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  blockName: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badge: { borderRadius: Radius.xs, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
  set: { fontSize: 14, lineHeight: 20, paddingVertical: 2 },
  reorderBtn: { alignItems: 'center', justifyContent: 'center' },
  addBtn: { marginTop: 4 },
  addBtnText: { fontSize: 13, fontWeight: '500' },
});
