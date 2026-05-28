import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useWorkoutExercises } from '@/hooks/useWorkoutExercises';
import { WorkoutExerciseCard } from '@/components/workout/WorkoutExerciseCard';
import { EditBlockModal } from '@/components/workout/EditBlockModal';
import { WorkoutService } from '@/services/WorkoutService';
import { SQLiteWorkoutRepository } from '@/repositories/SQLiteWorkoutRepository';
import { getDb } from '@/db';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { WorkoutExerciseDetail, BlockWithSets } from '@/services/WorkoutExerciseService';

const FAB_ICON_COLOR = '#fff' as const;
const SHADOW_COLOR = '#000' as const;

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(id) || 0;
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [workoutName, setWorkoutName] = useState('Séance');
  const [renamingBlock, setRenamingBlock] = useState<{ block: BlockWithSets; workoutExerciseId: number } | null>(null);
  const { exercises, loading, error, remove, refresh, updateSet, addSet, removeSet, updateBlock, removeBlock } = useWorkoutExercises(workoutId);

  useEffect(() => {
    const service = new WorkoutService(new SQLiteWorkoutRepository(getDb()));
    service.getById(workoutId).then(w => {
      if (w) setWorkoutName(w.name);
    });
  }, [workoutId]);

  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) { isFirstFocus.current = false; return; }
      refresh();
    }, [refresh])
  );

  function confirmRemove(detail: WorkoutExerciseDetail) {
    Alert.alert(
      'Supprimer l\'exercice',
      `Supprimer "${detail.exercise.name}" de cette séance ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => remove(detail.id) },
      ]
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: workoutName }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={exercises}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <WorkoutExerciseCard
              detail={item}
              onRemove={() => confirmRemove(item)}
              onUpdateSet={updateSet}
              onAddSet={addSet}
              onRemoveSet={removeSet}
              onRenameBlock={(block) => setRenamingBlock({ block, workoutExerciseId: item.id })}
              onRemoveBlock={removeBlock}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              Aucun exercice. Appuie sur + pour en ajouter un.
            </Text>
          }
        />
        <PressableA11y
          accessibilityLabel="Ajouter un exercice"
          style={[styles.fab, { backgroundColor: colors.primary }]}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onPress={() => router.push({ pathname: '/add-workout-exercise' as any, params: { workoutId: String(workoutId) } })}
        >
          <Ionicons name="add" size={28} color={FAB_ICON_COLOR} />
        </PressableA11y>
      </View>
      <EditBlockModal
        visible={renamingBlock !== null}
        block={renamingBlock ? {
          id: renamingBlock.block.id,
          workout_exercise_id: renamingBlock.workoutExerciseId,
          name: renamingBlock.block.name,
          order_index: renamingBlock.block.order_index,
          is_work_block: renamingBlock.block.is_work_block,
        } : null}
        workoutExerciseId={renamingBlock?.workoutExerciseId ?? 0}
        onSave={async (name, isWorkBlock) => {
          if (renamingBlock) await updateBlock(renamingBlock.block.id, { name, is_work_block: isWorkBlock });
        }}
        onClose={() => setRenamingBlock(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 100 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 15 },
  errorText: { fontSize: 15, textAlign: 'center', paddingHorizontal: 24 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
