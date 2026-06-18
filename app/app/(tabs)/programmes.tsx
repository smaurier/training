import { Spacing } from '@/constants/Spacing';
import { FlatList, View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { usePrograms } from '@/hooks/usePrograms';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { ProgramCard } from '@/components/programmes/ProgramCard';
import { AddProgrammeBottomSheet } from '@/components/programmes/AddProgrammeBottomSheet';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import { Program } from '@/db/types';
import { SQLiteWorkoutRepository } from '@/repositories/SQLiteWorkoutRepository';
import { getDb } from '@/db';

const SHADOW_COLOR = '#000' as const;

export default function ProgrammesScreen() {
  const { programs, loading, error, remove, setActive, refresh } = usePrograms();
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [workoutCounts, setWorkoutCounts] = useState<Record<number, number>>({});
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <PressableA11y
          onPress={() => router.push('/scan-programme' as any)}
          style={{ padding: Spacing.sm }}
          accessibilityLabel="Scanner un programme partagé"
          accessibilityRole="button"
        >
          <Ionicons name="qr-code-outline" size={24} color={colors.text} />
        </PressableA11y>
      ),
    });
  }, [navigation, router, colors.text]);

  useEffect(() => {
    if (programs.length === 0) return;
    const repo = new SQLiteWorkoutRepository(getDb());
    Promise.all(programs.map(p => repo.findByProgramId(p.id).then(ws => [p.id, ws.length] as [number, number])))
      .then(entries => setWorkoutCounts(Object.fromEntries(entries)))
      .catch(() => {});
  }, [programs]);

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

  function handleLongPress(program: Program) {
    const buttons: Parameters<typeof Alert.alert>[2] = [
      {
        text: 'Modifier',
        onPress: () => router.push({ pathname: '/add-programme', params: { id: String(program.id) } }),
      },
    ];
    if (program.is_active !== 1) {
      buttons.push({ text: 'Activer', onPress: () => setActive(program.id) });
    }
    buttons.push(
      { text: 'Supprimer', style: 'destructive', onPress: () => confirmDelete(program) },
      { text: 'Annuler', style: 'cancel' },
    );
    Alert.alert(program.name, 'Que veux-tu faire ?', buttons);
  }

  function confirmDelete(program: Program) {
    Alert.alert(
      'Supprimer le programme',
      `Supprimer "${program.name}" et toutes ses séances ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => remove(program.id),
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={programs}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ProgramCard
            program={item}
            workoutCount={workoutCounts[item.id] ?? 0}
            onPress={() => router.push({ pathname: '/programme/[id]', params: { id: String(item.id) } })}
            onLongPress={() => handleLongPress(item)}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            Aucun programme. Appuie sur + pour en créer un.
          </Text>
        }
      />
      <PressableA11y
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setBottomSheetOpen(true)}
        accessibilityLabel="Créer un programme"
      >
        <Ionicons name="add" size={28} color={colors.onPrimary} />
      </PressableA11y>
      <AddProgrammeBottomSheet
        isVisible={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        onCreateBlank={() => router.push('/add-programme')}
        onImportTemplate={() => router.push('/import-template')}
      />
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
