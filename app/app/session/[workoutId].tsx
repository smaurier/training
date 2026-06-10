// app/app/session/[workoutId].tsx
import { useEffect, useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useWorkoutExercises } from '@/hooks/useWorkoutExercises';
import { useSession } from '@/hooks/useSession';
import { useTimer } from '@/hooks/useTimer';
import { CheckInPhase } from '@/components/session/CheckInPhase';
import { RunningPhase } from '@/components/session/RunningPhase';
import { SummaryPhase } from '@/components/session/SummaryPhase';
import { ExerciseStartingWeightPhase } from '@/components/session/ExerciseStartingWeightPhase';
import { RestPhase } from '@/components/session/RestPhase';
import { ExerciseTransitionPhase } from '@/components/session/ExerciseTransitionPhase';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { resolveWeights } from '@/services/weightRatio';

export default function SessionScreen() {
  const { workoutId: param } = useLocalSearchParams<{ workoutId: string }>();
  const workoutId = Number(param) || 0;
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { exercises, refresh } = useWorkoutExercises(workoutId);
  const resolvedExercises = useMemo(() => exercises.map(resolveWeights), [exercises]);
  const session = useSession(workoutId, resolvedExercises);
  const timer = useTimer(120);

  const needsStartingWeight = useMemo(() => {
    if (session.phase !== 'running') return false;
    if (!session.currentExercise) return false;
    const firstTravailBlockIdx = session.currentExercise.blocks.findIndex(
      b => b.is_work_block === 1 && b.name === 'Travail'
    );
    if (firstTravailBlockIdx === -1) return false;
    if (session.position.blockIdx !== firstTravailBlockIdx || session.position.setIdx !== 0) return false;
    const travailSets = session.currentExercise.blocks[firstTravailBlockIdx].sets;
    if (travailSets.every(s => s.weight_type === 'bodyweight')) return false;
    return travailSets.every(s => s.weight === null);
  }, [session.phase, session.currentExercise, session.position]);

  useEffect(() => {
    if (session.phase === 'rest') {
      timer.reset(session.restDuration);
      timer.start();
    }
  }, [session.phase, session.restDuration, timer]);

  const handleStartingWeightConfirm = useCallback(async (weight: number) => {
    await session.setStartingWeight(weight);
    try {
      await refresh();
    } catch {
      // refresh() failed but weight was already set; next navigation will reload
    }
  }, [session, refresh]);

  const handleBack = useCallback(() => router.back(), [router]);

  const [summaryDurationSeconds, setSummaryDurationSeconds] = useState(0);
  useEffect(() => {
    if (session.phase === 'summary' && session.sessionStartedAt) {
      setSummaryDurationSeconds(Math.round((Date.now() - session.sessionStartedAt) / 1000));
    }
  }, [session.phase, session.sessionStartedAt]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {session.error && (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.text }]}>{session.error}</Text>
          </View>
        )}

        {!session.error && session.phase === 'checkin' && (
          <CheckInPhase onStart={session.startSession} />
        )}

        {!session.error && session.phase === 'exercise_transition' && session.currentExercise && (
          <ExerciseTransitionPhase
            exercise={session.currentExercise}
            exerciseNumber={session.position.exerciseIdx + 1}
            totalExercises={exercises.length}
            onContinue={session.confirmTransition}
          />
        )}

        {!session.error && session.phase === 'running' && session.currentSet && session.currentBlock && session.currentExercise && (
          needsStartingWeight ? (
            <ExerciseStartingWeightPhase
              exercise={session.currentExercise}
              onConfirm={handleStartingWeightConfirm}
            />
          ) : (
            <RunningPhase
              key={session.currentSet.id}
              exercise={session.currentExercise}
              block={session.currentBlock}
              set={session.currentSet}
              progressLabel={session.progressLabel}
              timer={timer}
              onValidate={session.validateSet}
              onSkip={session.skipSet}
              onSkipExercise={session.skipExercise}
              onUndo={session.undoLastSet}
              canUndo={session.canUndo}
              lastSetLog={session.lastSetLog}
            />
          )
        )}

        {!session.error && session.phase === 'rest' && (
          <RestPhase
            durationSeconds={session.restDuration}
            timer={timer}
            nextLabel={session.nextLabel}
            onContinue={session.confirmRest}
          />
        )}

        {!session.error && session.phase === 'summary' && (
          <SummaryPhase
            progressions={session.progressions}
            totalSets={session.totalSetsLogged}
            durationSeconds={summaryDurationSeconds}
            onClose={handleBack}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { fontSize: 16, textAlign: 'center' },
});
