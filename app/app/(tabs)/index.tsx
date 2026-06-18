import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useHomeWorkout } from '@/hooks/useHomeWorkout';
import { useWorkoutExercises } from '@/hooks/useWorkoutExercises';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import type { Workout } from '@/db/types';
import { ResumeSessionCard } from '@/components/session/ResumeSessionCard';
import type { PausedSessionInfo } from '@/services/SessionService';
import { SessionService } from '@/services/SessionService';
import { SQLiteSessionLogRepository } from '@/repositories/SQLiteSessionLogRepository';
import { SQLiteSetLogRepository } from '@/repositories/SQLiteSetLogRepository';
import { SQLitePersonalRecordRepository } from '@/repositories/SQLitePersonalRecordRepository';
import { SQLiteWorkoutRepository } from '@/repositories/SQLiteWorkoutRepository';
import { SQLiteWorkoutExerciseRepository } from '@/repositories/SQLiteWorkoutExerciseRepository';
import { SQLiteBlockRepository } from '@/repositories/SQLiteBlockRepository';
import { SQLiteSetRepository } from '@/repositories/SQLiteSetRepository';
import { SQLiteExerciseRepository } from '@/repositories/SQLiteExerciseRepository';
import { getDb } from '@/db';

function formatRelativeDate(isoDate: string | null | undefined): string {
  if (!isoDate) return 'Nouvelle';
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
  const [pausedSession, setPausedSession] = useState<PausedSessionInfo | null>(null);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const {
    workouts, suggestedWorkout, selectedWorkout, lastDates,
    isSuggestion, loading, hasActiveProgram, selectWorkout, refresh,
  } = useHomeWorkout();

  const { exercises: previewExercises } = useWorkoutExercises(selectedWorkout?.id ?? 0);
  const cycleDoneCount = suggestedWorkout
    ? workouts.findIndex(w => w.id === suggestedWorkout.id)
    : 0;

  useFocusEffect(useCallback(() => {
    refresh();
    const db = getDb();
    const service = new SessionService(
      new SQLiteSessionLogRepository(db),
      new SQLiteSetLogRepository(db),
      new SQLitePersonalRecordRepository(db),
      new SQLiteWorkoutRepository(db),
      new SQLiteWorkoutExerciseRepository(db),
      new SQLiteBlockRepository(db),
      new SQLiteSetRepository(db),
      new SQLiteExerciseRepository(db),
    );
    service.findAnyPausedSession().then(setPausedSession).catch(() => setPausedSession(null));
  }, [refresh]));

  const hasExercises = previewExercises.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {pausedSession && (
        <ResumeSessionCard
          workoutName={pausedSession.workoutName}
          serieLabel={
            pausedSession.setsLogged === 0
              ? 'Interrompue'
              : `${pausedSession.setsLogged} série${pausedSession.setsLogged > 1 ? 's' : ''} complétée${pausedSession.setsLogged > 1 ? 's' : ''}`
          }
          onPress={() =>
            router.push({
              pathname: '/session/[workoutId]' as any,
              params: { workoutId: String(pausedSession.sessionLog.workout_id) },
            })
          }
        />
      )}

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
          {/* Label + name */}
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            {isSuggestion ? 'PROCHAINE SÉANCE' : 'SÉANCE CHOISIE'}
          </Text>
          <Text style={[styles.workoutName, { color: colors.text }]}>{selectedWorkout.name}</Text>

          {/* CycleDots */}
          {workouts.length > 1 && (
            <View style={styles.cycleDots}>
              {workouts.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.cycleDot,
                    i < cycleDoneCount
                      ? { backgroundColor: colors.primary }
                      : { borderWidth: 1.5, borderColor: colors.border },
                  ]}
                />
              ))}
            </View>
          )}

          <Text style={[styles.lastDate, { color: colors.textSecondary }]}>
            {formatRelativeDate(lastDates.get(selectedWorkout.id))}
          </Text>

          {/* Exercise preview */}
          {previewExercises.length > 0 && (
            <View style={styles.exercisePreview}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary, marginBottom: 4 }]}>AU PROGRAMME</Text>
              {previewExercises.slice(0, 5).map((we, i) => {
                const workBlock = we.blocks.find(b => b.is_work_block === 1);
                const setCount = workBlock ? workBlock.sets.length : 0;
                const repsMin = workBlock?.sets[0]?.reps_min ?? 0;
                const setLabel = setCount > 0 && repsMin > 0 ? `${setCount} × ${repsMin}` : `${setCount} séries`;
                return (
                  <View
                    key={we.id}
                    style={[
                      styles.exerciseRow,
                      i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.exerciseRowName, { color: colors.text }]} numberOfLines={1}>
                      {we.exercise.name}
                    </Text>
                    <Text style={[styles.exerciseRowSets, { color: colors.textSecondary }]}>{setLabel}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Chips */}
          <View style={styles.chipsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
              contentContainerStyle={styles.chipsRow}
            >
              <View style={styles.chipsInner}>
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
                        { borderColor: colors.border, backgroundColor: colors.surfaceElevated },
                        isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                        !isSelected && isSug && { borderColor: colors.primary, opacity: 0.7 },
                      ] as StyleProp<ViewStyle>}
                    >
                      <Text style={[
                        styles.chipText,
                        { color: colors.textSecondary },
                        isSelected && { color: colors.onPrimary },
                      ]}>
                        {w.name}
                      </Text>
                    </PressableA11y>
                  );
                })}
              </View>
            </ScrollView>
            <LinearGradient
              colors={[`${colors.surface}00`, colors.surface]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.chipsFade}
              pointerEvents="none"
            />
          </View>

          {/* CTA */}
          <PressableA11y
            accessibilityLabel={hasExercises ? `Démarrer ${selectedWorkout.name}` : 'Aucun exercice dans cette séance'}
            accessibilityState={{ disabled: !hasExercises }}
            onPress={hasExercises
              ? () => router.push({ pathname: '/session/[workoutId]' as any, params: { workoutId: String(selectedWorkout.id) } })
              : undefined}
            style={[styles.startBtn, { backgroundColor: colors.primary, opacity: hasExercises ? 1 : 0.4 }]}
          >
            <Ionicons name="play" size={16} color={colors.onPrimary} importantForAccessibility="no" accessibilityElementsHidden={true} />
            <Text style={[styles.startBtnText, { color: colors.onPrimary }]}>DÉMARRER</Text>
          </PressableA11y>
          {!hasExercises && (
            <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
              Cette séance n'a pas encore d'exercices.
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 16 },
  card: { borderWidth: 1, borderRadius: Radius.sm, padding: 20, gap: 12 },
  cardLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.6 },
  workoutName: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  lastDate: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  cycleDots: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  cycleDot: { width: 8, height: 8, borderRadius: 999 },
  exercisePreview: { gap: 0, marginTop: 4 },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  exerciseRowName: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', marginRight: 12 },
  exerciseRowSets: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  chipsWrapper: { position: 'relative' },
  chipsScroll: { marginHorizontal: -4 },
  chipsRow: { paddingHorizontal: 4 },
  chipsInner: { flexDirection: 'row', gap: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  chipsFade: { position: 'absolute', right: -4, top: 0, bottom: 0, width: 48 },
  chip: {
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: Radius.xs,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, textTransform: 'uppercase' },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, minHeight: 60, borderRadius: Radius.sm,
  },
  startBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold', letterSpacing: 2, textTransform: 'uppercase' },
  emptyHint: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 8 },
  linkBtn: { paddingVertical: 4 },
  linkText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
});
