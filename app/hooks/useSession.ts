import { useState, useRef, useCallback, useEffect } from 'react';
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

export type SessionPhase = 'checkin' | 'exercise_transition' | 'running' | 'rest' | 'summary';

export interface SessionPosition {
  exerciseIdx: number;
  blockIdx: number;
  setIdx: number;
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
  validateSet: (actual: SetActual) => Promise<void>;
  skipSet: () => Promise<void>;
  setStartingWeight: (weight: number) => Promise<void>;
  confirmTransition: () => void;
  confirmRest: () => void;
  restDuration: number;
  nextLabel: string;
  progressions: ProgressionResult[];
  sessionStartedAt: number | null;
  totalSetsLogged: number;
  lastSetLog: LastSetLog | null;
  error: string | null;
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

export function useSession(workoutId: number, workoutDetails: WorkoutExerciseDetail[]): UseSessionResult {
  const serviceRef = useRef<SessionService | null>(null);
  if (!serviceRef.current) serviceRef.current = makeService();
  const service = serviceRef.current;

  const [phase, setPhase] = useState<SessionPhase>('checkin');
  const [sessionLogId, setSessionLogId] = useState<number | null>(null);
  const [position, setPosition] = useState<SessionPosition>({ exerciseIdx: 0, blockIdx: 0, setIdx: 0 });
  const [progressions, setProgressions] = useState<ProgressionResult[]>([]);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [totalSetsLogged, setTotalSetsLogged] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [restDuration, setRestDuration] = useState(90);
  const [pendingPhase, setPendingPhase] = useState<'running' | 'exercise_transition'>('running');
  const [nextLabel, setNextLabel] = useState('');
  const [lastSetLog, setLastSetLog] = useState<LastSetLog | null>(null);

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

  const validateSet = useCallback(async (actual: SetActual) => {
    if (!sessionLogId || !currentSet || !currentExercise) return;
    try {
      await service.logSet(sessionLogId, currentSet.id, currentExercise.exercise.id, actual);
      setTotalSetsLogged(n => n + 1);

      const completedRestDuration = currentSet.rest_duration;
      const next = advancePosition(position, workoutDetails);

      if (next === null) {
        await service.completeSession(sessionLogId);
        try {
          const progs = await service.calculateProgressions(sessionLogId);
          setProgressions(progs);
        } catch {
          setProgressions([]);
        }
        setPhase('summary');
        return;
      }

      const exerciseChanges = next.exerciseIdx !== position.exerciseIdx;

      if (completedRestDuration === 0) {
        setPosition(next);
        setPhase(exerciseChanges ? 'exercise_transition' : 'running');
        return;
      }

      setRestDuration(completedRestDuration);
      setPendingPhase(exerciseChanges ? 'exercise_transition' : 'running');
      setNextLabel(computeNextLabel(next, workoutDetails, exerciseChanges));
      setPosition(next);
      setPhase('rest');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur validation série');
    }
  }, [service, sessionLogId, currentSet, currentExercise, position, workoutDetails]);

  const confirmRest = useCallback(() => {
    setPhase(pendingPhase);
  }, [pendingPhase]);

  const confirmTransition = useCallback(() => {
    setPhase('running');
  }, []);

  const skipSet = useCallback(async () => {
    if (!sessionLogId) return;
    const next = advancePosition(position, workoutDetails);
    if (next === null) {
      await service.completeSession(sessionLogId);
      try {
        const progs = await service.calculateProgressions(sessionLogId);
        setProgressions(progs);
      } catch {
        setProgressions([]);
      }
      setPhase('summary');
    } else {
      setPosition(next);
    }
  }, [service, sessionLogId, position, workoutDetails]);

  const setStartingWeight = useCallback(async (weight: number) => {
    if (!currentExercise) return;
    try {
      await service.setStartingWeight(currentExercise.id, weight);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur poids de départ');
    }
  }, [service, currentExercise]);

  return {
    phase, sessionLogId, position,
    currentExercise, currentBlock, currentSet, progressLabel,
    startSession, validateSet, skipSet, setStartingWeight,
    confirmTransition, confirmRest, restDuration, nextLabel,
    progressions, sessionStartedAt, totalSetsLogged, lastSetLog, error,
  };
}
