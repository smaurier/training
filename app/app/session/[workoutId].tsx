// app/app/session/[workoutId].tsx
import { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
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
import type { SetActual } from '@/services/SessionService';
import type { InitialSession } from '@/hooks/useSession';
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
import { shouldWarnAbandon } from '@/services/sessionUtils';
import { Ionicons } from '@expo/vector-icons';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { Radius } from '@/constants/Radius';

function makeServiceForCheck(): SessionService {
  const db = getDb();
  return new SessionService(
    new SQLiteSessionLogRepository(db),
    new SQLiteSetLogRepository(db),
    new SQLitePersonalRecordRepository(db),
    new SQLiteWorkoutRepository(db),
    new SQLiteWorkoutExerciseRepository(db),
    new SQLiteBlockRepository(db),
    new SQLiteSetRepository(db),
    new SQLiteExerciseRepository(db),
  );
}

async function checkPausedOnMount(workoutId: number): Promise<{
  initialSession?: InitialSession;
  conflict?: PausedSessionInfo;
}> {
  const service = makeServiceForCheck();
  const paused = await service.findAnyPausedSession();
  if (!paused) return {};
  if (!shouldWarnAbandon(paused.sessionLog.workout_id, workoutId)) {
    if (!paused.sessionLog.paused_position) return {};
    const pos = JSON.parse(paused.sessionLog.paused_position);
    return {
      initialSession: {
        sessionLogId: paused.sessionLog.id,
        position: { exerciseIdx: pos.exerciseIdx, blockIdx: pos.blockIdx, setIdx: pos.setIdx },
        phase: pos.phase,
        startedAt: new Date(paused.sessionLog.started_at).getTime(),
        setsLogged: paused.setsLogged,
        volume: paused.volume,
      },
    };
  }
  return { conflict: paused };
}

export default function SessionScreen() {
  const { workoutId: param } = useLocalSearchParams<{ workoutId: string }>();
  const workoutId = Number(param) || 0;
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [mountResult, setMountResult] = useState<{
    initialSession?: InitialSession;
    conflict?: PausedSessionInfo;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    checkPausedOnMount(workoutId).then(result => {
      if (!cancelled) setMountResult(result);
    });
    return () => { cancelled = true; };
  }, [workoutId]);

  if (mountResult === null) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </>
    );
  }

  return (
    <SessionContent
      workoutId={workoutId}
      initialSession={mountResult.initialSession}
      conflict={mountResult.conflict}
    />
  );
}

interface SessionContentProps {
  workoutId: number;
  initialSession?: InitialSession;
  conflict?: PausedSessionInfo;
}

function SessionContent({ workoutId, initialSession, conflict }: SessionContentProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { exercises, refresh } = useWorkoutExercises(workoutId);
  const resolvedExercises = useMemo(() => exercises.map(resolveWeights), [exercises]);
  const session = useSession(workoutId, resolvedExercises, initialSession);
  const timer = useTimer(120);

  const needsStartingWeight = useMemo(() => {
    if (session.startingWeightDone) return false;
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
  }, [session.startingWeightDone, session.phase, session.currentExercise, session.position]);

  const { reset: timerReset, start: timerStart } = timer;

  useEffect(() => {
    if (session.phase === 'rest') {
      timerReset(session.restDuration);
      timerStart();
    }
  }, [session.phase, session.restDuration, timerReset, timerStart]);

  const handleStartingWeightConfirm = useCallback(async (weight: number) => {
    await session.setStartingWeight(weight);
    try {
      await refresh();
    } catch {
      // refresh() failed but weight was already set; next navigation will reload
    }
    session.markStartingWeightDone();
  }, [session, refresh]);

  const handleBack = useCallback(() => router.back(), [router]);

  const [summaryDurationSeconds, setSummaryDurationSeconds] = useState(0);
  useEffect(() => {
    if (session.phase === 'summary' && session.sessionStartedAt) {
      setSummaryDurationSeconds(Math.round((Date.now() - session.sessionStartedAt) / 1000));
    }
  }, [session.phase, session.sessionStartedAt]);

  const [prBadge, setPrBadge] = useState<string | null>(null);
  const prBadgeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (prBadgeTimeout.current) clearTimeout(prBadgeTimeout.current);
    };
  }, []);

  const handleValidate = useCallback(async (actual: SetActual) => {
    const exerciseName = session.currentExercise?.exercise.name ?? '';
    const isPR = await session.validateSet(actual);
    if (isPR && exerciseName) {
      if (prBadgeTimeout.current) clearTimeout(prBadgeTimeout.current);
      setPrBadge(exerciseName);
      AccessibilityInfo.announceForAccessibility('Nouveau record personnel !');
      prBadgeTimeout.current = setTimeout(() => setPrBadge(null), 3000);
    }
  }, [session.validateSet, session.currentExercise]);

  const handlePause = useCallback(async () => {
    try {
      await session.pauseSession();
      router.replace('/(tabs)');
    } catch {
      // error already shown via session.error
    }
  }, [session.pauseSession, router]);

  const abandonSheetRef = useRef<BottomSheetModal>(null);
  const abandonSnapPoints = useMemo(() => ['30%'], []);
  const abandoningRef = useRef(false);

  useEffect(() => {
    if (conflict) {
      abandonSheetRef.current?.present();
    }
  }, [conflict]);

  const handleAbandonConfirm = useCallback(async () => {
    if (!conflict) return;
    const service = makeServiceForCheck();
    await service.abandonSession(conflict.sessionLog.id);
    abandoningRef.current = true;
    abandonSheetRef.current?.dismiss();
  }, [conflict]);

  const handleAbandonCancel = useCallback(() => {
    if (abandoningRef.current) {
      abandoningRef.current = false;
      return;
    }
    abandonSheetRef.current?.dismiss();
    router.back();
  }, [router]);

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
          <CheckInPhase onStart={session.startSession} exercises={resolvedExercises} />
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
              onValidate={handleValidate}
              onSkip={session.skipSet}
              onSkipExercise={session.skipExercise}
              onUndo={session.undoLastSet}
              canUndo={session.canUndo}
              lastSetLog={session.lastSetLog}
              onAdjustWeight={session.setStartingWeight}
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
            totalVolumeKg={session.totalVolume}
            onClose={handleBack}
          />
        )}
      </View>
      {prBadge !== null && (
        <View style={styles.prBadge} pointerEvents="none">
          <Text style={styles.prBadgeIcon}>🏆</Text>
          <Text style={styles.prBadgeTitle}>Nouveau PR !</Text>
          <Text style={styles.prBadgeSub} numberOfLines={1}>{prBadge}</Text>
        </View>
      )}
      {session.phase !== 'checkin' && session.phase !== 'summary' && (
        <View style={styles.pauseButtonContainer} pointerEvents="box-none">
          <PressableA11y
            accessibilityLabel="Mettre la séance en pause"
            onPress={handlePause}
            style={styles.pauseButton}
          >
            <Ionicons name="pause-circle-outline" size={28} color={colors.textSecondary} />
          </PressableA11y>
        </View>
      )}
      <BottomSheetModal
        ref={abandonSheetRef}
        snapPoints={abandonSnapPoints}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        onDismiss={handleAbandonCancel}
      >
        <BottomSheetView style={styles.abandonSheet}>
          <Text style={[styles.abandonTitle, { color: colors.text }]}>Séance en pause</Text>
          <Text style={[styles.abandonBody, { color: colors.textSecondary }]}>
            Continuer abandonne la séance en pause ({conflict?.workoutName}).
          </Text>
          <View style={styles.abandonButtons}>
            <PressableA11y
              accessibilityLabel="Annuler et revenir"
              onPress={handleAbandonCancel}
              style={[styles.abandonBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.abandonBtnText, { color: colors.text }]}>Annuler</Text>
            </PressableA11y>
            <PressableA11y
              accessibilityLabel="Confirmer l'abandon de la séance en pause"
              onPress={handleAbandonConfirm}
              style={[styles.abandonBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.abandonBtnText, { color: '#fff' }]}>Confirmer</Text>
            </PressableA11y>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { fontSize: 16, textAlign: 'center' },
  prBadge: {
    position: 'absolute',
    top: 64,
    alignSelf: 'center',
    backgroundColor: '#ca8a04',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    zIndex: 100,
    alignItems: 'center',
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  prBadgeIcon: { fontSize: 24 },
  prBadgeTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  prBadgeSub: { color: '#fef3c7', fontSize: 13, maxWidth: 200 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pauseButtonContainer: {
    position: 'absolute',
    top: 48,
    right: 16,
    zIndex: 50,
  },
  pauseButton: {
    padding: 8,
  },
  abandonSheet: { padding: 20, gap: 12 },
  abandonTitle: { fontSize: 17, fontWeight: '700' },
  abandonBody: { fontSize: 14, lineHeight: 20 },
  abandonButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  abandonBtn: {
    flex: 1, paddingVertical: 12, borderRadius: Radius.sm,
    alignItems: 'center', borderWidth: 1,
  },
  abandonBtnText: { fontSize: 15, fontWeight: '600' },
});
