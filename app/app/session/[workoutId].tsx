// app/app/session/[workoutId].tsx
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useWorkoutExercises } from '@/hooks/useWorkoutExercises';
import { useSession } from '@/hooks/useSession';
import { useTimer } from '@/hooks/useTimer';
import { CheckInPhase } from '@/components/session/CheckInPhase';
import { RunningPhase } from '@/components/session/RunningPhase';
import { SummaryPhase } from '@/components/session/SummaryPhase';
import { ExerciseStartingWeightPhase } from '@/components/session/ExerciseStartingWeightPhase';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function SessionScreen() {
  const { workoutId: param } = useLocalSearchParams<{ workoutId: string }>();
  const workoutId = Number(param) || 0;
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { exercises, refresh } = useWorkoutExercises(workoutId);
  const session = useSession(workoutId, exercises);
  const timer = useTimer(120);

  // Quand la position change (nouvelle série), reset le timer avec rest_duration de la série courante
  const prevPositionRef = useRef(session.position);
  useEffect(() => {
    if (
      session.phase === 'running' &&
      session.position !== prevPositionRef.current &&
      session.currentSet
    ) {
      timer.reset(session.currentSet.rest_duration);
      timer.start();
    }
    prevPositionRef.current = session.position;
  }, [session.position, session.phase, session.currentSet]);

  const needsStartingWeight = useMemo(() => {
    if (session.phase !== 'running') return false;
    if (!session.currentExercise) return false;
    const firstTravailBlockIdx = session.currentExercise.blocks.findIndex(
      b => b.is_work_block === 1 && b.name === 'Travail'
    );
    if (firstTravailBlockIdx === -1) return false;
    if (session.position.blockIdx !== firstTravailBlockIdx || session.position.setIdx !== 0) return false;
    return session.currentExercise.blocks[firstTravailBlockIdx].sets.every(s => s.weight === null);
  }, [session.phase, session.currentExercise, session.position]);

  const handleStartingWeightConfirm = useCallback(async (weight: number) => {
    await session.setStartingWeight(weight);
    try {
      await refresh();
    } catch {
      // refresh() failed but weight was already set; next navigation will reload
    }
  }, [session, refresh]);

  const handleBack = useCallback(() => router.back(), [router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {session.phase === 'checkin' && (
          <CheckInPhase onStart={session.startSession} />
        )}
        {session.phase === 'running' && session.currentSet && session.currentBlock && session.currentExercise && (
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
            />
          )
        )}
        {session.phase === 'summary' && (
          <SummaryPhase
            progressions={session.progressions}
            totalSets={session.totalSetsLogged}
            durationSeconds={session.sessionStartedAt ? Math.round((Date.now() - session.sessionStartedAt) / 1000) : 0}
            onClose={handleBack}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
