
// app/app/session/[workoutId].tsx
import { Spacing } from '@/constants/Spacing';
import { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { LetterSpacing, FontFamily} from '@/constants/Typography';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useWorkoutExercises } from '@/hooks/useWorkoutExercises';
import { useSession } from '@/hooks/useSession';
import { useTimer } from '@/hooks/useTimer';
import { useSessionSummary } from '@/hooks/useSessionSummary';
import { usePRBadge } from '@/hooks/usePRBadge';
import { CheckInPhase } from '@/components/session/CheckInPhase';
import { RunningPhase, type RunningPhaseHandle } from '@/components/session/RunningPhase';
import { SummaryPhase } from '@/components/session/SummaryPhase';
import { ExerciseStartingWeightPhase } from '@/components/session/ExerciseStartingWeightPhase';
import { RestPhase } from '@/components/session/RestPhase';
import { ExerciseTransitionPhase } from '@/components/session/ExerciseTransitionPhase';
import { WarmupPhase } from '@/components/session/WarmupPhase';
import { SessionPhaseErrorBoundary } from '@/components/session/SessionPhaseErrorBoundary';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { SemanticColors } from '@/constants/SemanticColors';
import { resolveWeights } from '@/services/weightRatio';
import { makeSessionService } from '@/services/makeSessionService';
import type { PausedSessionInfo } from '@/services/SessionService';
import type { InitialSession, SessionPosition } from '@/hooks/useSession';
import type { WorkoutExerciseDetail } from '@/services/WorkoutExerciseService';
import { DeloadService, applyDeloadToExercises } from '@/services/DeloadService';
import { getPlateStep } from '@/services/settingsUtils';
import { SQLiteSettingsRepository } from '@/repositories/SQLiteSettingsRepository';
import { SQLiteSessionLogRepository } from '@/repositories/SQLiteSessionLogRepository';
import { getDb } from '@/db';
import { shouldWarnAbandon } from '@/services/sessionUtils';
import { Ionicons } from '@expo/vector-icons';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { Radius } from '@/constants/Radius';
import { createNotificationScheduler } from '@/services/createNotificationScheduler';
import { NotificationService } from '@/services/NotificationService';
import type { NotifSettings } from '@/services/NotificationService';

const NOTIF_KEY = 'notif_settings';

async function loadNotifSettings(): Promise<NotifSettings | null> {
  const repo = new SQLiteSettingsRepository(getDb());
  const raw = await repo.get(NOTIF_KEY);
  return raw ? JSON.parse(raw) as NotifSettings : null;
}

async function persistNotifSettings(s: NotifSettings): Promise<void> {
  const repo = new SQLiteSettingsRepository(getDb());
  await repo.set(NOTIF_KEY, JSON.stringify(s));
}

const notifScheduler = createNotificationScheduler();
const notifService = new NotificationService(notifScheduler, loadNotifSettings, persistNotifSettings);

async function checkPausedOnMount(workoutId: number): Promise<{
  initialSession?: InitialSession;
  conflict?: PausedSessionInfo;
}> {
  const service = makeSessionService();
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
        timerState: pos.timerCountdown != null
          ? { countdown: pos.timerCountdown, started: pos.timerStarted ?? false }
          : undefined,
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

function getSupersetPosition(
  position: SessionPosition,
  details: WorkoutExerciseDetail[]
): { current: number; total: number } | undefined {
  const groupId = details[position.exerciseIdx]?.superset_group_id;
  if (groupId == null) return undefined;
  const group = details
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d.superset_group_id === groupId)
    .sort((a, b) => a.i - b.i);
  const pos = group.findIndex(g => g.i === position.exerciseIdx);
  return { current: pos + 1, total: group.length };
}

function getSupersetExerciseNames(
  position: SessionPosition,
  details: WorkoutExerciseDetail[]
): string[] | undefined {
  const groupId = details[position.exerciseIdx]?.superset_group_id;
  if (groupId == null) return undefined;
  return details
    .filter(d => d.superset_group_id === groupId)
    .sort((a, b) => details.indexOf(a) - details.indexOf(b))
    .map(d => d.exercise.name);
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

  const [deloadSuggested, setDeloadSuggested] = useState(false);
  const [isDeloadSession, setIsDeloadSession] = useState(false);
  const [plateStep, setPlateStep] = useState<number>(2);

  useEffect(() => {
    const repo = new SQLiteSettingsRepository(getDb());
    repo.get('plate_step').then(v => setPlateStep(getPlateStep(v))).catch(console.error);
  }, []);

  useEffect(() => {
    const db = getDb();
    const service = new DeloadService(
      new SQLiteSettingsRepository(db),
      new SQLiteSessionLogRepository(db),
    );
    service.shouldSuggestDeload(workoutId).then(setDeloadSuggested).catch(console.error);
  }, [workoutId]);

  const resolvedExercises = useMemo(() => exercises.map(resolveWeights), [exercises]);
  const deloadedExercises = useMemo(
    () => isDeloadSession ? applyDeloadToExercises(resolvedExercises, plateStep) : resolvedExercises,
    [isDeloadSession, resolvedExercises, plateStep],
  );
  const session = useSession(workoutId, deloadedExercises, initialSession, plateStep);
  const timer = useTimer(120);

  const summary = useSessionSummary(
    session.sessionLogId,
    workoutId,
    session.phase,
    exercises,
    isDeloadSession,
    session.sessionStartedAt,
  );

  const { prBadge, handleValidate } = usePRBadge(
    session.validateSet,
    session.currentExercise?.exercise.name ?? '',
  );

  const needsStartingWeight = useMemo(() => {
    if (session.startingWeightDone) return false;
    if (session.phase !== 'running') return false;
    if (!session.currentExercise) return false;
    if (session.currentExercise.exercise.type === 'cardio') return false;
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

  const handleBack = useCallback(async () => {
    if (session.sessionLogId) {
      await makeSessionService()
        .saveSessionMeta(session.sessionLogId, summary.selectedTags, summary.sessionNotes.trim() || null)
        .catch(console.error);
    }
    if (session.phase === 'summary') {
      await notifService.scheduleInactivityCheck(new Date()).catch(console.error);
    }
    router.back();
  }, [session.sessionLogId, session.phase, summary.selectedTags, summary.sessionNotes, router]);

  const handlePause = useCallback(async () => {
    try {
      const timerState = runningPhaseRef.current?.getTimerState();
      await session.pauseSession(timerState);
      router.replace('/(tabs)');
    } catch {
      // error already shown via session.error
    }
  }, [session, router]);

  const runningPhaseRef = useRef<RunningPhaseHandle | null>(null);
  const resumeTimerForSetId = useRef<number | null>(
    initialSession?.timerState != null ? session.currentSet?.id ?? null : null
  );

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
    await makeSessionService().abandonSession(conflict.sessionLog.id);
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
        {session.phase !== 'checkin' && session.phase !== 'summary' && (
          <SafeAreaView edges={['top']} style={styles.pauseButtonRow}>
            <PressableA11y
              accessibilityLabel="Mettre la séance en pause"
              onPress={handlePause}
              style={[styles.pauseButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Ionicons name="pause-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.pauseButtonLabel, { color: colors.textSecondary }]}>Pause</Text>
            </PressableA11y>
          </SafeAreaView>
        )}
        <View style={styles.phaseContent}>
        <SessionPhaseErrorBoundary onBack={handleBack}>
        {session.error && (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.text }]}>{session.error}</Text>
          </View>
        )}

        {!session.error && session.phase === 'checkin' && (
          <CheckInPhase
            onStart={session.startSession}
            exercises={resolvedExercises}
            deloadSuggested={deloadSuggested}
            onDeloadApplied={() => setIsDeloadSession(true)}
          />
        )}

        {!session.error && session.phase === 'exercise_transition' && session.currentExercise && (
          <ExerciseTransitionPhase
            exercise={session.currentExercise}
            exerciseNumber={session.position.exerciseIdx + 1}
            totalExercises={exercises.length}
            onContinue={session.confirmTransition}
            supersetGroup={getSupersetExerciseNames(session.position, deloadedExercises)}
          />
        )}

        {!session.error && session.phase === 'warmup' && session.currentExercise && (
          <WarmupPhase
            exerciseName={session.currentExercise.exercise.name}
            workWeight={session.warmupWorkWeight}
            plateStep={plateStep}
            onStart={session.confirmWarmup}
          />
        )}

        {!session.error && session.phase === 'running' && session.currentSet && session.currentBlock && session.currentExercise && (
          <>
            {isDeloadSession && (
              <View style={[styles.deloadBanner, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <Text style={[styles.deloadBannerText, { color: colors.textSecondary }]}>Séance décharge</Text>
              </View>
            )}
            {needsStartingWeight ? (
              <ExerciseStartingWeightPhase
                exercise={session.currentExercise}
                plateStep={plateStep}
                onConfirm={handleStartingWeightConfirm}
              />
            ) : (
              <RunningPhase
                ref={runningPhaseRef}
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
                supersetPosition={getSupersetPosition(session.position, deloadedExercises)}
                supersetExerciseNames={getSupersetExerciseNames(session.position, deloadedExercises)}
                onSubstituteExercise={session.substituteCurrentExercise}
                isSubstituted={session.isCurrentExerciseSubstituted}
                initialCountdown={session.currentSet.id === resumeTimerForSetId.current ? initialSession?.timerState?.countdown : undefined}
                initialTimerStarted={session.currentSet.id === resumeTimerForSetId.current ? initialSession?.timerState?.started : undefined}
                onFinish={session.finishEarly}
              />
            )}
          </>
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
            durationSeconds={summary.summaryDurationSeconds}
            totalVolumeKg={session.totalVolume}
            plateaus={summary.plateaus}
            rpeLabel={summary.rpeLabel}
            previousSession={summary.prevSummary}
            suggestNextDeload={deloadSuggested && !isDeloadSession}
            onMoodSelect={summary.handleMoodSelect}
            selectedMood={summary.selectedMood}
            selectedTags={summary.selectedTags}
            onTagToggle={summary.handleTagToggle}
            notes={summary.sessionNotes}
            onNotesChange={summary.setSessionNotes}
            onClose={handleBack}
            emptyCardioSetLogCount={summary.emptyCardioSetLogCount}
            onSaveCardioData={summary.handleSaveCardioData}
          />
        )}
        </SessionPhaseErrorBoundary>
        </View>
      </View>
      {prBadge !== null && (
        <View style={styles.prBadge} pointerEvents="none">
          <Text style={styles.prBadgeIcon}>🏆</Text>
          <Text style={styles.prBadgeTitle}>✦ Nouvelle meilleure marque</Text>
          <Text style={styles.prBadgeSub} numberOfLines={1}>{prBadge}</Text>
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
              <Text style={[styles.abandonBtnText, { color: colors.onPrimary }]}>Confirmer</Text>
            </PressableA11y>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xxxl },
  errorText: { fontSize: 16, textAlign: 'center' },
  prBadge: {
    position: 'absolute',
    top: 64,
    alignSelf: 'center',
    backgroundColor: SemanticColors.prBadge,
    borderRadius: 14,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
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
  prBadgeTitle: { color: '#000', fontSize: 16, fontFamily: FontFamily.bold },
  prBadgeSub: { color: SemanticColors.prBadgeTint, fontSize: 13, maxWidth: 200 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  phaseContent: { flex: 1 },
  pauseButtonRow: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  pauseButtonLabel: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
  },
  abandonSheet: { padding: Spacing.xl, gap: Spacing.md },
  abandonTitle: { fontSize: 17, fontFamily: FontFamily.bold },
  abandonBody: { fontSize: 14, lineHeight: 20 },
  abandonButtons: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  abandonBtn: {
    flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.sm,
    alignItems: 'center', borderWidth: 1,
  },
  abandonBtnText: { fontSize: 15, fontFamily: FontFamily.semibold },
  deloadBanner: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  deloadBannerText: { fontSize: 12, fontFamily: FontFamily.medium, letterSpacing: LetterSpacing.wide },
});
