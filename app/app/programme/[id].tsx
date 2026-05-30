import { FlatList, View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { usePrograms } from '@/hooks/usePrograms';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useWorkouts } from '@/hooks/useWorkouts';
import { WorkoutCard } from '@/components/programmes/WorkoutCard';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import { Workout } from '@/db/types';
import { SQLiteWorkoutExerciseRepository } from '@/repositories/SQLiteWorkoutExerciseRepository';
import { getDb } from '@/db';

const FAB_ICON_COLOR = '#fff' as const;
const SHADOW_COLOR = '#000' as const;

export default function ProgrammeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const programId = Number(id) || 0;

  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { programs } = usePrograms();
  const program = programs.find(p => p.id === programId);

  const { workouts, loading, error, remove, reorder, refresh } = useWorkouts(programId);

  const [exerciseCounts, setExerciseCounts] = useState<Record<number, number>>({});
  useEffect(() => {
    if (workouts.length === 0) return;
    const repo = new SQLiteWorkoutExerciseRepository(getDb());
    Promise.all(workouts.map(w => repo.findByWorkoutId(w.id).then(es => [w.id, es.length] as [number, number])))
      .then(entries => setExerciseCounts(Object.fromEntries(entries)))
      .catch(() => {});
  }, [workouts]);

  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refresh();
    }, [refresh])
  );

  function handleLongPress(workout: Workout) {
    Alert.alert(
      workout.name,
      'Que veux-tu faire ?',
      [
        {
          text: 'Modifier',
          onPress: () =>
            router.push({ pathname: '/add-workout', params: { programId: String(programId), id: String(workout.id) } }),
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => confirmDelete(workout),
        },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  }

  function confirmDelete(workout: Workout) {
    Alert.alert(
      'Supprimer la séance',
      `Supprimer "${workout.name}" ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => remove(workout.id),
        },
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
      <Stack.Screen
        options={{
          title: program?.name ?? 'Programme',
          headerRight: () => (
            <PressableA11y
              onPress={() =>
                router.push({ pathname: '/add-programme', params: { id: String(programId) } })
              }
              style={styles.headerBtn}
              accessibilityLabel="Modifier le programme"
            >
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </PressableA11y>
          ),
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={workouts}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => (
            <WorkoutCard
              workout={item}
              exerciseCount={exerciseCounts[item.id] ?? 0}
              isFirst={index === 0}
              isLast={index === workouts.length - 1}
              onPress={() => router.push({ pathname: '/workout/[id]', params: { id: String(item.id) } })}
              onLongPress={() => handleLongPress(item)}
              onMoveUp={() => reorder(item.id, 'up')}
              onMoveDown={() => reorder(item.id, 'down')}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              Aucune séance. Appuie sur + pour en ajouter une.
            </Text>
          }
        />
        <PressableA11y
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() =>
            router.push({ pathname: '/add-workout', params: { programId: String(programId) } })
          }
          accessibilityLabel="Ajouter une séance"
        >
          <Ionicons name="add" size={28} color={FAB_ICON_COLOR} />
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
  headerBtn: { padding: 8 },
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
});
