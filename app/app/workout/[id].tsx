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
import type { WorkoutExerciseDetail } from '@/services/WorkoutExerciseService';

const FAB_ICON_COLOR = '#fff' as const;
const SHADOW_COLOR = '#000' as const;

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
          data={exercises}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => (
            <WorkoutExerciseCard
              detail={item}
              isFirst={index === 0}
              isLast={index === exercises.length - 1}
              onMoveUp={() => reorderExercise(item.id, 'up')}
              onMoveDown={() => reorderExercise(item.id, 'down')}
              onReorderBlock={reorderBlock}
              onRemove={() => confirmRemove(item)}
              onUpdateSet={updateSet}
              onAddSet={addSet}
              onRemoveSet={removeSet}
              onAddBlock={addBlock}
              onUpdateBlock={updateBlock}
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
        <PressableA11y
          accessibilityLabel="Démarrer la séance"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onPress={() => router.push({ pathname: '/session/[workoutId]' as any, params: { workoutId: String(workoutId) } })}
          style={[styles.startBtn, { backgroundColor: '#16a34a' }]}
        >
          <Ionicons name="play" size={18} color="#fff" />
          <Text style={styles.startBtnText}>Démarrer la séance</Text>
        </PressableA11y>
      </View>
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
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.sm,
    elevation: 4,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  startBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
