import { Spacing } from '@/constants/Spacing';
import { FontFamily } from '@/constants/Typography';
import { useState } from 'react';
import { View, Text, TextInput, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useLoggedExercises } from '@/hooks/useLoggedExercises';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import type { Exercise } from '@/db/types';

export default function ExerciseSearchScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { exercises, isLoading, error } = useLoggedExercises();
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? exercises.filter(e => e.name.toLowerCase().includes(query.toLowerCase()))
    : exercises;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TextInput
        style={[styles.searchInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        placeholder="Rechercher un exercice…"
        placeholderTextColor={colors.textSecondary}
        value={query}
        onChangeText={setQuery}
        autoFocus
        clearButtonMode="while-editing"
        accessibilityLabel="Rechercher un exercice"
      />
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            Impossible de charger les exercices
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            {exercises.length === 0 ? 'Aucun exercice loggé' : 'Aucun résultat'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: Exercise) => String(item.id)}
          renderItem={({ item }) => (
            <PressableA11y
              accessibilityLabel={item.name}
              onPress={() => router.push({
                pathname: '/progression/[exerciseId]' as any,
                params: { exerciseId: String(item.id), exerciseName: item.name },
              })}
              style={[styles.row, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
            </PressableA11y>
          )}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchInput: { margin: Spacing.lg, borderRadius: Radius.sm, padding: Spacing.md, fontSize: 15, borderWidth: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 14 },
  row: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  name: { fontSize: 15, fontFamily: FontFamily.medium },
});
