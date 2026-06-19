import { Spacing } from '@/constants/Spacing';
import { FontFamily, LetterSpacing } from '@/constants/Typography';
import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useWorkoutExercises } from '@/hooks/useWorkoutExercises';
import { WorkoutExerciseCard } from '@/components/workout/WorkoutExerciseCard';
import { WorkoutService } from '@/services/WorkoutService';
import { SQLiteWorkoutRepository } from '@/repositories/SQLiteWorkoutRepository';
import { getDb } from '@/db';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import { SemanticColors } from '../../constants/SemanticColors';
import type { WorkoutExerciseDetail } from '@/services/WorkoutExerciseService';

const SHADOW_COLOR = '#000' as const;

type RenderItem =
  | { type: 'standalone'; exercise: WorkoutExerciseDetail; index: number }
  | { type: 'superset'; members: { exercise: WorkoutExerciseDetail; index: number; label: string }[] };

function buildRenderItems(exercises: WorkoutExerciseDetail[]): RenderItem[] {
  const items: RenderItem[] = [];
  let i = 0;
  while (i < exercises.length) {
    const ex = exercises[i];
    const groupId = ex.superset_group_id;
    if (groupId != null) {
      const members: { exercise: WorkoutExerciseDetail; index: number; label: string }[] = [];
      const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let labelIdx = 0;
      while (i < exercises.length && exercises[i].superset_group_id === groupId) {
        members.push({ exercise: exercises[i], index: i, label: LABELS[labelIdx++] ?? String(labelIdx) });
        i++;
      }
      items.push({ type: 'superset', members });
    } else {
      items.push({ type: 'standalone', exercise: ex, index: i });
      i++;
    }
  }
  return items;
}

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(id) || 0;
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [workoutName, setWorkoutName] = useState('Séance');
  const {
    exercises,
    loading,
    error,
    remove,
    refresh,
    updateSet,
    addSet,
    removeSet,
    addBlock,
    updateBlock,
    removeBlock,
    reorderExercise,
    reorderBlock,
    linkToNext,
    unlink,
  } = useWorkoutExercises(workoutId);

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

  if (loading && exercises.length === 0) {
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
          data={buildRenderItems(exercises)}
          keyExtractor={(item) =>
            item.type === 'standalone'
              ? String(item.exercise.id)
              : `superset-${item.members[0].exercise.id}`
          }
          renderItem={({ item }) => {
            if (item.type === 'standalone') {
              const { exercise, index } = item;
              return (
                <WorkoutExerciseCard
                  detail={exercise}
                  isFirst={index === 0}
                  isLast={index === exercises.length - 1}
                  isLastInWorkout={index === exercises.length - 1}
                  onMoveUp={() => reorderExercise(exercise.id, 'up')}
                  onMoveDown={() => reorderExercise(exercise.id, 'down')}
                  onReorderBlock={reorderBlock}
                  onRemove={() => confirmRemove(exercise)}
                  onUpdateSet={updateSet}
                  onAddSet={addSet}
                  onRemoveSet={removeSet}
                  onAddBlock={addBlock}
                  onUpdateBlock={updateBlock}
                  onRemoveBlock={removeBlock}
                  onLinkToNext={index < exercises.length - 1 ? () => linkToNext(exercise.id, exercises[index + 1].id) : undefined}
                />
              );
            }
            // Superset group container
            const lastMemberIndex = item.members[item.members.length - 1].index;
            return (
              <View style={styles.supersetContainer}>
                <View style={styles.supersetLabel}>
                  <Text style={styles.supersetLabelText}>SUPERSET</Text>
                </View>
                {item.members.map(({ exercise, index, label }) => (
                  <WorkoutExerciseCard
                    key={exercise.id}
                    detail={exercise}
                    isFirst={index === 0}
                    isLast={index === exercises.length - 1}
                    isLastInWorkout={index === exercises.length - 1}
                    supersetGroupLabel={label}
                    onMoveUp={() => reorderExercise(exercise.id, 'up')}
                    onMoveDown={() => reorderExercise(exercise.id, 'down')}
                    onReorderBlock={reorderBlock}
                    onRemove={() => confirmRemove(exercise)}
                    onUpdateSet={updateSet}
                    onAddSet={addSet}
                    onRemoveSet={removeSet}
                    onAddBlock={addBlock}
                    onUpdateBlock={updateBlock}
                    onRemoveBlock={removeBlock}
                    onUnlink={() => unlink(exercise.id)}
                    onLinkToNext={
                      index === lastMemberIndex && lastMemberIndex < exercises.length - 1
                        ? () => linkToNext(exercise.id, exercises[lastMemberIndex + 1].id)
                        : undefined
                    }
                  />
                ))}
              </View>
            );
          }}
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
          onPress={() => router.push({ pathname: '/add-workout-exercise' as any, params: { workoutId: String(workoutId) } })}
        >
          <Ionicons name="add" size={28} color={colors.onPrimary} />
        </PressableA11y>
        {exercises.length > 0 && (
          <PressableA11y
            accessibilityLabel="Démarrer la séance"
            onPress={() => router.push({ pathname: '/session/[workoutId]' as any, params: { workoutId: String(workoutId) } })}
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="play" size={18} color="#000" />
            <Text style={[styles.startBtnText, { color: colors.onPrimary }]}>DÉMARRER</Text>
          </PressableA11y>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: Spacing.lg, paddingBottom: 100 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 15 },
  errorText: { fontSize: 15, textAlign: 'center', paddingHorizontal: Spacing.xxl },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  startBtn: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 88,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.sm,
    elevation: 4,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  startBtnText: { fontSize: 15, fontFamily: FontFamily.bold, letterSpacing: LetterSpacing.max },
  supersetContainer: {
    borderWidth: 2,
    borderColor: SemanticColors.superset,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.xs,
    position: 'relative',
    paddingTop: Spacing.lg,
  },
  supersetLabel: {
    position: 'absolute',
    top: -10,
    left: 12,
    backgroundColor: SemanticColors.superset,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  supersetLabelText: { color: '#fff', fontSize: 10, fontFamily: FontFamily.bold },
});
