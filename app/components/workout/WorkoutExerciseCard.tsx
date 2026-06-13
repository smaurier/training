import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WorkoutExerciseDetail, BlockWithSets } from '@/services/WorkoutExerciseService';
import type { Block } from '@/db/types';
import type { UpdateSetDto } from '@/repositories/ISetRepository';
import type { UpdateBlockDto } from '@/repositories/IBlockRepository';
import { BlockCard } from './BlockCard';
import { EditBlockModal } from './EditBlockModal';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

interface WorkoutExerciseCardProps {
  detail: WorkoutExerciseDetail;
  onRemove: () => void;
  onUpdateSet: (setId: number, dto: UpdateSetDto) => Promise<void>;
  onAddSet: (blockId: number) => Promise<void>;
  onRemoveSet: (setId: number) => Promise<void>;
  onAddBlock: (workoutExerciseId: number, name: string, isWorkBlock: 0 | 1) => Promise<void>;
  onUpdateBlock: (blockId: number, dto: UpdateBlockDto) => Promise<void>;
  onRemoveBlock: (blockId: number) => Promise<void>;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => Promise<void>;
  onMoveDown: () => Promise<void>;
  onReorderBlock: (workoutExerciseId: number, blockId: number, direction: 'up' | 'down') => Promise<void>;
  supersetGroupLabel?: string;
  isLastInWorkout?: boolean;
  onLinkToNext?: () => void;
  onUnlink?: () => void;
}

export function WorkoutExerciseCard({
  detail,
  onRemove,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onAddBlock,
  onUpdateBlock,
  onRemoveBlock,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onReorderBlock,
  supersetGroupLabel,
  isLastInWorkout,
  onLinkToNext,
  onUnlink,
}: WorkoutExerciseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  function handleLongPress() {
    Alert.alert(detail.exercise.name, 'Que veux-tu faire ?', [
      { text: 'Supprimer', style: 'destructive', onPress: onRemove },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  function handleRenameBlock(block: BlockWithSets) {
    setEditingBlock({
      id: block.id,
      workout_exercise_id: detail.id,
      name: block.name,
      order_index: block.order_index,
      is_work_block: block.is_work_block,
    });
  }

  function handleBlockModalClose() {
    setShowAddBlock(false);
    setEditingBlock(null);
  }

  async function handleBlockSave(name: string, isWorkBlock: 0 | 1) {
    if (editingBlock) {
      await onUpdateBlock(editingBlock.id, { name, is_work_block: isWorkBlock });
    } else {
      await onAddBlock(detail.id, name, isWorkBlock);
    }
    setShowAddBlock(false);
    setEditingBlock(null);
  }

  let muscleGroups = '';
  try {
    const parsedMuscles = detail.exercise.muscle_groups ? JSON.parse(detail.exercise.muscle_groups) : [];
    muscleGroups = Array.isArray(parsedMuscles) ? parsedMuscles.join(', ') : '';
  } catch {
    muscleGroups = '';
  }

  const typeColor = detail.exercise.type === 'etirement'
    ? '#16a34a'
    : detail.exercise.type === 'cardio'
    ? '#ea580c'
    : colors.primary;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.typeStripe, { backgroundColor: typeColor }]} />
      <View style={styles.header}>
        <PressableA11y
          accessibilityLabel={`${detail.exercise.name}, ${expanded ? 'réduire' : 'développer'}`}
          accessibilityHint="Appuyer longuement pour supprimer"
          accessibilityState={{ expanded }}
          onPress={() => setExpanded(e => !e)}
          onLongPress={handleLongPress}
          style={styles.headerMain}
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
        {!isFirst && (
          <PressableA11y
            accessibilityLabel={`Monter ${detail.exercise.name}`}
            onPress={onMoveUp}
            style={styles.reorderBtn}
          >
            <Ionicons name="chevron-up-outline" size={16} color={colors.textSecondary} />
          </PressableA11y>
        )}
        {!isLast && (
          <PressableA11y
            accessibilityLabel={`Descendre ${detail.exercise.name}`}
            onPress={onMoveDown}
            style={styles.reorderBtn}
          >
            <Ionicons name="chevron-down-outline" size={16} color={colors.textSecondary} />
          </PressableA11y>
        )}
      </View>

      {expanded && (
        <View style={styles.blocks}>
          {detail.blocks.length === 1 && (
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Ajoute des blocs pour structurer ta séance : Échauffement, Travail, Back-off…
            </Text>
          )}
          {detail.blocks.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>Aucun bloc configuré.</Text>
          ) : (
            detail.blocks.map((block, index) => (
              <BlockCard
                key={block.id}
                block={block}
                isFirst={index === 0}
                isLast={index === detail.blocks.length - 1}
                onMoveUp={() => onReorderBlock(detail.id, block.id, 'up')}
                onMoveDown={() => onReorderBlock(detail.id, block.id, 'down')}
                onUpdateSet={onUpdateSet}
                onAddSet={onAddSet}
                onRemoveSet={onRemoveSet}
                onRenameBlock={handleRenameBlock}
                onRemoveBlock={onRemoveBlock}
              />
            ))
          )}

          <PressableA11y
            accessibilityLabel="Ajouter un bloc"
            onPress={() => setShowAddBlock(true)}
            style={styles.addBlockBtn}
          >
            <Text style={[styles.addBlockText, { color: colors.primary }]}>+ Ajouter un bloc</Text>
          </PressableA11y>
        </View>
      )}

      {/* Superset controls */}
      <View style={styles.supersetRow}>
        {supersetGroupLabel ? (
          <>
            <View style={[styles.supersetBadge, { backgroundColor: '#7c3aed20', borderColor: '#7c3aed', borderWidth: 1 }]}>
              <Text style={[styles.supersetBadgeText, { color: '#7c3aed' }]}>
                SUPERSET · {supersetGroupLabel}
              </Text>
            </View>
            {onUnlink && (
              <PressableA11y
                accessibilityLabel="Délier cet exercice du superset"
                onPress={onUnlink}
                style={styles.unlinkBtn}
              >
                <Text style={[styles.unlinkBtnText, { color: colors.textSecondary }]}>✕ Délier</Text>
              </PressableA11y>
            )}
          </>
        ) : (
          !isLastInWorkout && onLinkToNext && (
            <PressableA11y
              accessibilityLabel="Grouper cet exercice avec le suivant en superset"
              onPress={onLinkToNext}
              style={[styles.linkBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.linkBtnText, { color: colors.textSecondary }]}>🔗 Grouper avec le suivant</Text>
            </PressableA11y>
          )
        )}
      </View>

      <EditBlockModal
        visible={showAddBlock || editingBlock !== null}
        block={editingBlock}
        workoutExerciseId={detail.id}
        onSave={handleBlockSave}
        onClose={handleBlockModalClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.sm, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  typeStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  header: { flexDirection: 'row', alignItems: 'center', paddingRight: 4, minHeight: 56 },
  headerMain: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingVertical: 16, paddingRight: 8, gap: 8 },
  headerContent: { flex: 1, gap: 2 },
  reorderBtn: { alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '600' },
  muscles: { fontSize: 12 },
  blocks: { padding: 12, paddingTop: 0, gap: 8 },
  empty: { fontSize: 13, fontStyle: 'italic', paddingVertical: 4 },
  hint: { fontSize: 12, fontStyle: 'italic', paddingVertical: 4, lineHeight: 18 },
  addBlockBtn: { marginTop: 4, paddingVertical: 8 },
  addBlockText: { fontSize: 13, fontWeight: '500' },
  supersetRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  supersetBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  supersetBadgeText: { fontSize: 11, fontWeight: '700' },
  linkBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  linkBtnText: { fontSize: 12 },
  unlinkBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  unlinkBtnText: { fontSize: 12 },
});
