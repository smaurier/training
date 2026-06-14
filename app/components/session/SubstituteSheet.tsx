import { useRef, useState, useMemo, useCallback } from 'react';
import { Text, TextInput, StyleSheet } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { Exercise } from '@/db/types';
import type { WorkoutExerciseDetail } from '@/services/WorkoutExerciseService';
import { SQLiteExerciseRepository } from '@/repositories/SQLiteExerciseRepository';
import { getDb } from '@/db';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

type ExerciseStub = WorkoutExerciseDetail['exercise'];

interface SubstituteSheetProps {
  sheetRef: React.RefObject<BottomSheet | null>;
  currentMuscleGroups: string[];
  onSelect: (exercise: ExerciseStub) => void;
  onClose: () => void;
}

export function SubstituteSheet({ sheetRef, currentMuscleGroups, onSelect, onClose }: SubstituteSheetProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const hasLoaded = useRef(false);
  const snapPoints = useMemo(() => ['75%', '90%'], []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    [],
  );

  function handleAnimate(_fromIndex: number, toIndex: number) {
    if (toIndex >= 0 && !hasLoaded.current) {
      hasLoaded.current = true;
      new SQLiteExerciseRepository(getDb()).findAll().then(setExercises).catch(console.error);
    }
  }

  const filtered = useMemo(() => {
    if (searchQuery.trim()) {
      return exercises.filter(ex =>
        ex.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return exercises.filter(ex => {
      try {
        const groups = JSON.parse(ex.muscle_groups) as string[];
        return groups.some(g => currentMuscleGroups.includes(g));
      } catch { return false; }
    });
  }, [exercises, currentMuscleGroups, searchQuery]);

  function handleSelect(exercise: Exercise) {
    sheetRef.current?.close();
    onSelect({
      id: exercise.id,
      name: exercise.name,
      type: exercise.type,
      technical_notes: exercise.technical_notes,
      muscle_groups: exercise.muscle_groups,
      description: exercise.description,
    });
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onAnimate={handleAnimate}
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <BottomSheetView style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Remplacer l'exercice</Text>
        <TextInput
          style={[styles.search, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Rechercher par nom…"
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel="Rechercher un exercice de remplacement"
          returnKeyType="search"
        />
      </BottomSheetView>
      {filtered.length === 0 ? (
        <BottomSheetView style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Aucun exercice — recherchez par nom
          </Text>
        </BottomSheetView>
      ) : (
        <BottomSheetFlatList
          data={filtered}
          keyExtractor={ex => String(ex.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <PressableA11y
              accessibilityLabel={`Choisir ${item.name}`}
              onPress={() => handleSelect(item)}
              style={[styles.row, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.rowName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.rowType, { color: colors.textSecondary }]}>{item.type}</Text>
            </PressableA11y>
          )}
        />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  title: { fontSize: 17, fontWeight: '600' },
  search: { borderWidth: 1, borderRadius: Radius.sm, padding: 10, fontSize: 16 },
  emptyContainer: { paddingHorizontal: 20, paddingTop: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, fontStyle: 'italic', textAlign: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  row: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 },
  rowName: { fontSize: 16 },
  rowType: { fontSize: 12 },
});
