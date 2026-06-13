import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { SessionService, CheckIn, SetActual, ProgressionResult, LastSetLog } from '../services/SessionService';
import { SQLiteSessionLogRepository } from '../repositories/SQLiteSessionLogRepository';
import { SQLiteSetLogRepository } from '../repositories/SQLiteSetLogRepository';
import { SQLitePersonalRecordRepository } from '../repositories/SQLitePersonalRecordRepository';
import { SQLiteWorkoutRepository } from '../repositories/SQLiteWorkoutRepository';
import { SQLiteWorkoutExerciseRepository } from '../repositories/SQLiteWorkoutExerciseRepository';
import { SQLiteBlockRepository } from '../repositories/SQLiteBlockRepository';
import { SQLiteSetRepository } from '../repositories/SQLiteSetRepository';
import { SQLiteExerciseRepository } from '../repositories/SQLiteExerciseRepository';
import type { WorkoutExerciseDetail, BlockWithSets } from '../services/WorkoutExerciseService';
import type { Set as TrainingSet } from '../db/types';
import { getDb } from '../db';
import { shouldShowWarmup } from '../services/warmup';

export type SessionPhase = 'checkin' | 'exercise_transition' | 'running' | 'rest' | 'summary' | 'warmup';

export interface SessionPosition {
  exerciseIdx: number;
  blockIdx: number;
  setIdx: number;
}

interface HistoryEntry {
  position: SessionPosition;
  setId: number;
}

export interface InitialSession {
  sessionLogId: number;
  position: SessionPosition;
  phase: SessionPhase;
  startedAt: number;
  setsLogged: number;
  volume: number;
}

export interface UseSessionResult {
  phase: SessionPhase;
  sessionLogId: number | null;
  position: SessionPosition;
  currentExercise: WorkoutExerciseDetail | null;
  currentBlock: BlockWithSets | null;
  currentSet: TrainingSet | null;
  progressLabel: string;
  startSession: (checkin: CheckIn) => Promise<void>;
  validateSet: (actual: SetActual) => Promise<boolean>;
  skipSet: () => Promise<void>;
  skipExercise: () => Promise<void>;
  undoLastSet: () => Promise<void>;
  canUndo: boolean;
  setStartingWeight: (weight: number) => Promise<void>;
  startingWeightDone: boolean;
  markStartingWeightDone: () => void;
  warmupWorkWeight: number;
  confirmTransition: () => void;
  confirmWarmup: () => void;
  confirmRest: () => void;
  restDuration: number;
  nextLabel: string;
  progressions: ProgressionResult[];
  sessionStartedAt: number | null;
  totalSetsLogged: number;
  totalVolume: number;
  lastSetLog: LastSetLog | null;
  error: string | null;
  pauseSession: () => Promise<void>;
}

export function advancePosition(
  position: SessionPosition,
  details: WorkoutExerciseDetail[]
): SessionPosition | null {
  const { exerciseIdx, blockIdx, setIdx } = position;
  const exercise = details[exerciseIdx];
  if (!exercise) return null;
  const block = exercise.blocks[blockIdx];
  if (!block) return null;
  if (setIdx + 1 < block.sets.length) return { exerciseIdx, blockIdx, setIdx: setIdx + 1 };
  if (blockIdx + 1 < exercise.blocks.length) return { exerciseIdx, blockIdx: blockIdx + 1, setIdx: 0 };
  if (exerciseIdx + 1 < details.length) return { exerciseIdx: exerciseIdx + 1, blockIdx: 0, setIdx: 0 };
  return null;
}

export function computeNextLabel(
  next: SessionPosition,
  exercises: WorkoutExerciseDetail[],
  exerciseChanges: boolean
): string {
  if (exerciseChanges) {
    return `Exercice suivant : ${exercises[next.exerciseIdx]?.exercise.name ?? ''}`;
  }
  const nextBlock = exercises[next.exerciseIdx]?.blocks[next.blockIdx];
  const totalSets = nextBlock?.sets.length ?? 1;
  const setNum = next.setIdx + 1;
  const weight = nextBlock?.sets[next.setIdx]?.weight;
  const weightLabel = weight != null ? ` — ${weight}kg` : '';
  return `Série ${setNum}/${totalSets}${weightLabel}`;
}

function makeService(): SessionService {
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

export function useSession(
  workoutId: number,
  workoutDetails: WorkoutExerciseDetail[],
  initialSession?: InitialSession,
  plateStep: number = 2,
): UseSessionResult {
  const service = useMemo(() => makeService(), []);

  const [phase, setPhase] = useState<SessionPhase>(() => initialSession?.phase ?? 'checkin');
  const [sessionLogId, setSessionLogId] = useState<number | null>(() => initialSession?.sessionLogId ?? null);
  const [position, setPosition] = useState<SessionPosition>(() =>
    initialSession?.position ?? { exerciseIdx: 0, blockIdx: 0, setIdx: 0 }
  );
  const [progressions, setProgressions] = useState<ProgressionResult[]>([]);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(() => initialSession?.startedAt ?? null);
  const [totalSetsLogged, setTotalSetsLogged] = useState(() => initialSession?.setsLogged ?? 0);
  const [totalVolume, setTotalVolume] = useState(() => initialSession?.volume ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [restDuration, setRestDuration] = useState(90);
  const [pendingPhase, setPendingPhase] = useState<'running' | 'exercise_transition'>('running');
  const [nextLabel, setNextLabel] = useState('');
  const [lastSetLog, setLastSetLog] = useState<LastSetLog | null>(null);
  const [warmupWorkWeight, setWarmupWorkWeight] = useState(0);

  const positionHistory = useRef<HistoryEntry[]>([]);
  const [historySize, setHistorySize] = useState(0);
  const [startingWeightDone, setStartingWeightDone] = useState(false);

  const currentExercise = workoutDetails[position.exerciseIdx] ?? null;
  const currentBlock = currentExercise?.blocks[position.blockIdx] ?? null;
  const currentSet = currentBlock?.sets[position.setIdx] ?? null;
  const progressLabel = currentExercise
    ? `${position.exerciseIdx + 1} / ${workoutDetails.length} exercices`
    : '';

  useEffect(() => {
    if (!currentSet) { setLastSetLog(null); return; }
    let cancelled = false;
    service.getLastSetLog(currentSet.id).then(log => {
      if (!cancelled) setLastSetLog(log);
    }).catch(() => {
      if (!cancelled) setLastSetLog(null);
    });
    return () => { cancelled = true; };
  }, [service, currentSet?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const startSession = useCallback(async (checkin: CheckIn) => {
    if (workoutDetails.length === 0) {
      setError('Cette séance ne contient aucun exercice');
      return;
    }
    try {
      const log = await service.startSession(workoutId, checkin);
      setSessionLogId(log.id);
      setSessionStartedAt(Date.now());
      setPhase('exercise_transition');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur démarrage séance');
    }
  }, [service, workoutId, workoutDetails]);

  const validateSet = useCallback(async (actual: SetActual): Promise<boolean> => {
    if (!sessionLogId || !currentSet || !currentExercise) return false;
    try {
      const { isPR } = await service.logSet(sessionLogId, currentSet.id, currentExercise.exercise.id, actual);
      positionHistory.current.push({ position: { ...position }, setId: currentSet.id });
      setHistorySize(n => n + 1);
      setTotalSetsLogged(n => n + 1);
      setTotalVolume(n => n + (actual.weightDone ?? 0) * (actual.repsDone ?? 0));

      const completedRestDuration = currentSet.rest_duration;
      const next = advancePosition(position, workoutDetails);

      if (next === null) {
        await service.completeSession(sessionLogId);
        try {
          const progs = await service.calculateProgressions(sessionLogId, plateStep);
          setProgressions(progs);
        } catch {
          setProgressions([]);
        }
        setPhase('summary');
        return isPR;
      }

      const exerciseChanges = next.exerciseIdx !== position.exerciseIdx;
      if (exerciseChanges) setStartingWeightDone(false);

      if (completedRestDuration === 0) {
        setPosition(next);
        setPhase(exerciseChanges ? 'exercise_transition' : 'running');
        return isPR;
      }

      setRestDuration(completedRestDuration);
      setPendingPhase(exerciseChanges ? 'exercise_transition' : 'running');
      setNextLabel(computeNextLabel(next, workoutDetails, exerciseChanges));
      setPosition(next);
      setPhase('rest');
      return isPR;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur validation série');
      return false;
    }
  }, [service, sessionLogId, currentSet, currentExercise, position, workoutDetails, plateStep]);

  const confirmRest = useCallback(() => {
    setPhase(pendingPhase);
  }, [pendingPhase]);

  const confirmTransition = useCallback(() => {
    if (phase !== 'exercise_transition') return;
    const exercise = workoutDetails[position.exerciseIdx];
    const travailBlock = exercise?.blocks.find(b => b.is_work_block === 1 && b.name === 'Travail');
    const firstSet = travailBlock?.sets[0];
    if (firstSet && shouldShowWarmup(firstSet.weight ?? 0, firstSet.weight_type)) {
      setWarmupWorkWeight(firstSet.weight ?? 0);
      setPhase('warmup');
    } else {
      // Pas de bloc Travail ou poids non qualifié → pas d'échauffement
      setPhase('running');
    }
  }, [phase, workoutDetails, position.exerciseIdx]);

  const confirmWarmup = useCallback(() => {
    setPhase('running');
  }, []);

  const skipSet = useCallback(async () => {
    if (!sessionLogId) return;
    const next = advancePosition(position, workoutDetails);
    if (next === null) {
      await service.completeSession(sessionLogId);
      try {
        const progs = await service.calculateProgressions(sessionLogId, plateStep);
        setProgressions(progs);
      } catch {
        setProgressions([]);
      }
      setPhase('summary');
    } else {
      setPosition(next);
    }
  }, [service, sessionLogId, position, workoutDetails, plateStep]);

  const undoLastSet = useCallback(async () => {
    if (!sessionLogId || positionHistory.current.length === 0) return;
    const entry = positionHistory.current[positionHistory.current.length - 1]!;
    try {
      await service.deleteSetLog(entry.setId, sessionLogId);
      positionHistory.current.pop();
      setHistorySize(n => n - 1);
      setTotalSetsLogged(n => n - 1);
      setPosition(entry.position);
      setPhase('running');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur annulation série');
    }
  }, [service, sessionLogId]);

  const canUndo = historySize > 0;

  const skipExercise = useCallback(async () => {
    if (!sessionLogId) return;
    positionHistory.current = [];
    setHistorySize(0);
    const nextExerciseIdx = position.exerciseIdx + 1;
    if (nextExerciseIdx >= workoutDetails.length) {
      await service.completeSession(sessionLogId);
      try {
        const progs = await service.calculateProgressions(sessionLogId, plateStep);
        setProgressions(progs);
      } catch {
        setProgressions([]);
      }
      setPhase('summary');
    } else {
      setPosition({ exerciseIdx: nextExerciseIdx, blockIdx: 0, setIdx: 0 });
      setPhase('exercise_transition');
    }
  }, [service, sessionLogId, position.exerciseIdx, workoutDetails.length, plateStep]);

  const setStartingWeight = useCallback(async (weight: number) => {
    if (!currentExercise) return;
    try {
      await service.setStartingWeight(currentExercise.id, weight);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur poids de départ');
    }
  }, [service, currentExercise]);

  const markStartingWeightDone = useCallback(() => {
    setStartingWeightDone(true);
  }, []);

  const pauseSession = useCallback(async () => {
    if (!sessionLogId) return;
    try {
      await service.pauseSession(sessionLogId, position, phase);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur pause séance');
      throw e;
    }
  }, [service, sessionLogId, position, phase]);

  return {
    phase, sessionLogId, position,
    currentExercise, currentBlock, currentSet, progressLabel,
    startSession, validateSet, skipSet, skipExercise, undoLastSet, canUndo,
    setStartingWeight, startingWeightDone, markStartingWeightDone,
    warmupWorkWeight, confirmTransition, confirmRest, confirmWarmup, restDuration, nextLabel,
    progressions, sessionStartedAt, totalSetsLogged, totalVolume, lastSetLog, error, pauseSession,
  };
}
