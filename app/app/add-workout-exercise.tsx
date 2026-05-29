import { useState } from 'react';
import { View, Text, FlatList, TextInput, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useWorkoutExercises } from '@/hooks/useWorkoutExercises';
import { useExercises } from '@/hooks/useExercises';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import type { Exercise } from '@/db/types';

export default function AddWorkoutExerciseScreen() {
  const { workoutId: workoutIdParam } = useLocalSearchParams<{ workoutId: string }>();
  const workoutId = Number(workoutIdParam) || 0;
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [search, setSearch] = useState('');
  const { add } = useWorkoutExercises(workoutId);
  const { exercises, loading } = useExercises();

  const filtered = exercises.filter(ex => {
    const q = search.toLowerCase();
    return ex.name.toLowerCase().includes(q) || ex.muscle_groups.toLowerCase().includes(q);
  });

  async function handleSelect(exercise: Exercise) {
    try {
      await add(exercise.id);
      router.back();
    } catch {
      Alert.alert("Erreur", "Impossible d'ajouter l'exercice. Réessaie.");
    }
  }

  function parseMuscleGroups(raw: string): string {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.join(', ') : '';
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Ajouter un exercice' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TextInput
          style={[styles.search, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
          placeholder="Rechercher..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Rechercher un exercice"
          accessibilityRole="search"
        />
        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <PressableA11y
                accessibilityLabel={`Ajouter ${item.name}`}
                accessibilityHint="Ajoute cet exercice à la séance"
                onPress={() => handleSelect(item)}
                style={[styles.item, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.itemMuscles, { color: colors.textSecondary }]} numberOfLines={1}>
                  {parseMuscleGroups(item.muscle_groups)}
                </Text>
              </PressableA11y>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.empty, { color: colors.textSecondary }]}>
                  Aucun exercice trouvé.
                </Text>
                <PressableA11y
                  accessibilityLabel="Créer un exercice"
                  accessibilityHint="Ouvre le formulaire de création d'exercice"
                  onPress={() => router.push('/add-exercise')}
                  style={[styles.createBtn, { borderColor: colors.primary }]}
                >
                  <Text style={[styles.createBtnText, { color: colors.primary }]}>
                    + Créer un exercice
                  </Text>
                </PressableA11y>
              </View>
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  search: { margin: 16, padding: 12, borderRadius: Radius.sm, borderWidth: 1, fontSize: 15 },
  loader: { marginTop: 48 },
  item: { padding: 16, borderBottomWidth: 1, gap: 2 },
  itemName: { fontSize: 15, fontWeight: '500' },
  itemMuscles: { fontSize: 13 },
  emptyContainer: { alignItems: 'center', marginTop: 48, gap: 16 },
  empty: { fontSize: 15 },
  createBtn: { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 20, paddingVertical: 10 },
  createBtnText: { fontSize: 15, fontWeight: '500' },
});
