import { useState, useEffect, useRef, useCallback } from 'react';
import { WorkoutExerciseService, WorkoutExerciseDetail } from '../services/WorkoutExerciseService';
import { SQLiteWorkoutExerciseRepository } from '../repositories/SQLiteWorkoutExerciseRepository';
import { SQLiteBlockRepository } from '../repositories/SQLiteBlockRepository';
import { SQLiteSetRepository } from '../repositories/SQLiteSetRepository';
import { SQLiteExerciseRepository } from '../repositories/SQLiteExerciseRepository';
import { getDb } from '../db';

export interface UseWorkoutExercisesResult {
  exercises: WorkoutExerciseDetail[];
  loading: boolean;
  error: string | null;
  add: (exerciseId: number) => Promise<void>;
  remove: (workoutExerciseId: number) => Promise<void>;
  refresh: () => Promise<void>;
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

  return { exercises, loading, error, add, remove, refresh };
}
