import { useState, useEffect, useRef, useCallback } from 'react';
import { WorkoutExerciseService, WorkoutExerciseDetail } from '../services/WorkoutExerciseService';
import { SQLiteWorkoutExerciseRepository } from '../repositories/SQLiteWorkoutExerciseRepository';
import { SQLiteBlockRepository } from '../repositories/SQLiteBlockRepository';
import { SQLiteSetRepository } from '../repositories/SQLiteSetRepository';
import { SQLiteExerciseRepository } from '../repositories/SQLiteExerciseRepository';
import { UpdateSetDto } from '../repositories/ISetRepository';
import { UpdateBlockDto } from '../repositories/IBlockRepository';
import { getDb } from '../db';

export interface UseWorkoutExercisesResult {
  exercises: WorkoutExerciseDetail[];
  loading: boolean;
  error: string | null;
  add: (exerciseId: number) => Promise<void>;
  remove: (workoutExerciseId: number) => Promise<void>;
  refresh: () => Promise<void>;
  updateSet: (setId: number, dto: UpdateSetDto) => Promise<void>;
  addSet: (blockId: number) => Promise<void>;
  removeSet: (setId: number) => Promise<void>;
  addBlock: (workoutExerciseId: number, name: string, isWorkBlock: 0 | 1) => Promise<void>;
  updateBlock: (blockId: number, dto: UpdateBlockDto) => Promise<void>;
  removeBlock: (blockId: number) => Promise<void>;
}

function makeService(): WorkoutExerciseService {
  const db = getDb();
  return new WorkoutExerciseService(
    new SQLiteWorkoutExerciseRepository(db),
    new SQLiteBlockRepository(db),
    new SQLiteSetRepository(db),
    new SQLiteExerciseRepository(db),
    (fn) => db.withTransactionAsync(fn),
  );
}

export function useWorkoutExercises(workoutId: number): UseWorkoutExercisesResult {
  const serviceRef = useRef<WorkoutExerciseService | null>(null);
  if (!serviceRef.current) serviceRef.current = makeService();
  const service = serviceRef.current;

  const [exercises, setExercises] = useState<WorkoutExerciseDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await service.getWithDetails(workoutId);
      if (mountedRef.current) setExercises(data);
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [service, workoutId]);

  useEffect(() => { refresh(); }, [refresh]);

  const add = useCallback(async (exerciseId: number) => {
    try {
      await service.addToWorkout(workoutId, exerciseId);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, workoutId, refresh]);

  const remove = useCallback(async (workoutExerciseId: number) => {
    try {
      await service.remove(workoutExerciseId);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  const updateSet = useCallback(async (setId: number, dto: UpdateSetDto) => {
    try {
      await service.updateSet(setId, dto);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  const addSet = useCallback(async (blockId: number) => {
    try {
      await service.addSet(blockId);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  const removeSet = useCallback(async (setId: number) => {
    try {
      await service.removeSet(setId);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  const addBlock = useCallback(async (workoutExerciseId: number, name: string, isWorkBlock: 0 | 1) => {
    try {
      await service.addBlock(workoutExerciseId, name, isWorkBlock);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  const updateBlock = useCallback(async (blockId: number, dto: UpdateBlockDto) => {
    try {
      await service.updateBlock(blockId, dto);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  const removeBlock = useCallback(async (blockId: number) => {
    try {
      await service.removeBlock(blockId);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  return { exercises, loading, error, add, remove, refresh, updateSet, addSet, removeSet, addBlock, updateBlock, removeBlock };
}
