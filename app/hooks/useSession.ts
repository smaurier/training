import { useState, useRef, useCallback } from 'react';
import { SessionService, CheckIn, SetActual, ProgressionResult } from '../services/SessionService';
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

export type SessionPhase = 'checkin' | 'running' | 'summary';

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
  skipSet: () => void;
  setStartingWeight: (weight: number) => Promise<void>;
  progressions: ProgressionResult[];
  sessionStartedAt: number | null;
  totalSetsLogged: number;
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

  const currentExercise = workoutDetails[position.exerciseIdx] ?? null;
  const currentBlock = currentExercise?.blocks[position.blockIdx] ?? null;
  const currentSet = currentBlock?.sets[position.setIdx] ?? null;
  const progressLabel = currentExercise
    ? `${position.exerciseIdx + 1} / ${workoutDetails.length} exercices`
    : '';

  const startSession = useCallback(async (checkin: CheckIn) => {
    try {
      const log = await service.startSession(workoutId, checkin);
      setSessionLogId(log.id);
      setSessionStartedAt(Date.now());
      setPhase('running');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur démarrage séance');
    }
  }, [service, workoutId]);

  const validateSet = useCallback(async (actual: SetActual) => {
    if (!sessionLogId || !currentSet || !currentExercise) return;
    try {
      await service.logSet(sessionLogId, currentSet.id, currentExercise.exercise.id, actual);
      setTotalSetsLogged(n => n + 1);

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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur validation série');
    }
  }, [service, sessionLogId, currentSet, currentExercise, position, workoutDetails]);

  const skipSet = useCallback(() => {
    const next = advancePosition(position, workoutDetails);
    if (next === null) {
      setPhase('summary');
    } else {
      setPosition(next);
    }
  }, [position, workoutDetails]);

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
    progressions, sessionStartedAt, totalSetsLogged, error,
  };
}
