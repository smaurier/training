import { Spacing } from '@/constants/Spacing';
import { FlatList, View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useExercises } from '@/hooks/useExercises';
import { ExerciseCard } from '@/components/exercises/ExerciseCard';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

const SHADOW_COLOR = '#000' as const;

export default function ExercicesScreen() {
  const { exercises, loading, error, refresh, deleteExercise } = useExercises();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

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

  const handleDeleteExercise = useCallback((id: number) => {
    deleteExercise(id).then(conflict => {
      if (!conflict) return;
      const parts: string[] = [];
      if (conflict.programs > 0) parts.push(`utilisé dans ${conflict.programs} programme(s)`);
      if (conflict.sessions > 0) parts.push(`${conflict.sessions} série(s) enregistrée(s)`);
      Alert.alert(
        'Supprimer quand même ?',
        `Cet exercice est ${parts.join(' et ')}. Cette action est irréversible.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: () => { deleteExercise(id, true).catch(() => {}); },
          },
        ],
      );
    }).catch(() => {});
  }, [deleteExercise]);

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={exercises}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ExerciseCard exercise={item} onDelete={handleDeleteExercise} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            Aucun exercice. Appuie sur + pour en ajouter un.
          </Text>
        }
      />
      <PressableA11y
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/add-exercise')}
        accessibilityLabel="Ajouter un exercice"
      >
        <Ionicons name="add" size={28} color={colors.onPrimary} />
      </PressableA11y>
    </View>
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
});
