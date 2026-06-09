import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useHomeWorkout } from '@/hooks/useHomeWorkout';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import type { Workout } from '@/db/types';

function formatRelativeDate(isoDate: string | null | undefined): string {
  if (!isoDate) return 'Jamais faite';
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const sessionMidnight = new Date(isoDate);
  sessionMidnight.setHours(0, 0, 0, 0);
  const diffDays = Math.round((todayMidnight.getTime() - sessionMidnight.getTime()) / 86_400_000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  return `il y a ${diffDays} jours`;
}

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const {
    workouts, suggestedWorkout, selectedWorkout, lastDates,
    isSuggestion, loading, hasActiveProgram, selectWorkout, refresh,
  } = useHomeWorkout();

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.hero}>
        <Ionicons name="barbell-outline" size={52} color={colors.primary} importantForAccessibility="no" accessibilityElementsHidden={true} />
        <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">Prêt à s'entraîner ?</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : !hasActiveProgram ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Aucun programme actif</Text>
          <PressableA11y
            accessibilityLabel="Aller aux programmes"
            onPress={() => router.push('/(tabs)/programmes')}
            style={styles.linkBtn}
          >
            <Text style={[styles.linkText, { color: colors.primary }]}>Créer un programme →</Text>
          </PressableA11y>
        </View>
      ) : workouts.length === 0 ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Aucune séance configurée</Text>
          <PressableA11y
            accessibilityLabel="Aller aux programmes"
            onPress={() => router.push('/(tabs)/programmes')}
            style={styles.linkBtn}
          >
            <Text style={[styles.linkText, { color: colors.primary }]}>Configurer une séance →</Text>
          </PressableA11y>
        </View>
      ) : selectedWorkout ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            {isSuggestion ? 'PROCHAINE SÉANCE' : 'SÉANCE CHOISIE'}
          </Text>
          <Text style={[styles.workoutName, { color: colors.text }]}>{selectedWorkout.name}</Text>
          <Text style={[styles.lastDate, { color: colors.textSecondary }]}>
            {formatRelativeDate(lastDates.get(selectedWorkout.id))}
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsRow}
          >
            <View
              style={styles.chipsInner}
            >
              {workouts.map((w: Workout) => {
                const isSelected = w.id === selectedWorkout.id;
                const isSug = w.id === suggestedWorkout?.id;
                return (
                  <PressableA11y
                    key={w.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${w.name}${isSug && !isSelected ? ' — suggéré par le cycle' : ''}`}
                    onPress={() => selectWorkout(w)}
                    style={[
                      styles.chip,
                      { borderColor: colors.border },
                      isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                      !isSelected && isSug && { borderColor: colors.primary, opacity: 0.7 },
                    ] as StyleProp<ViewStyle>}
                  >
                    <Text style={[
                      styles.chipText,
                      { color: colors.textSecondary },
                      isSelected && styles.chipTextSelected,
                    ]}>
                      {w.name}
                    </Text>
                  </PressableA11y>
                );
              })}
            </View>
          </ScrollView>

          <PressableA11y
            accessibilityLabel={`Démarrer ${selectedWorkout.name}`}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onPress={() => router.push({ pathname: '/session/[workoutId]' as any, params: { workoutId: String(selectedWorkout.id) } })}
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="play" size={18} color="#fff" importantForAccessibility="no" accessibilityElementsHidden={true} />
            <Text style={styles.startBtnText}>Démarrer</Text>
          </PressableA11y>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 24 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  card: { borderWidth: 1, borderRadius: Radius.sm, padding: 20, gap: 10 },
  cardLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  workoutName: { fontSize: 20, fontWeight: '700' },
  lastDate: { fontSize: 12 },
  chipsScroll: { marginHorizontal: -4 },
  chipsRow: { paddingHorizontal: 4 },
  chipsInner: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: { fontSize: 13, fontWeight: '500' },
  chipTextSelected: { color: '#fff', fontWeight: '700' },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: Radius.sm,
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkBtn: { paddingVertical: 4 },
  linkText: { fontSize: 15, fontWeight: '500' },
});
