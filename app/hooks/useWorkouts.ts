import { useState, useEffect, useRef, useCallback } from 'react';
import { Workout } from '../db/types';
import { WorkoutService, CreateWorkoutInput, UpdateWorkoutInput } from '../services/WorkoutService';
import { SQLiteWorkoutRepository } from '../repositories/SQLiteWorkoutRepository';
import { getDb } from '../db';

export interface UseWorkoutsResult {
  workouts: Workout[];
  loading: boolean;
  error: string | null;
  create: (input: CreateWorkoutInput) => Promise<void>;
  update: (id: number, input: UpdateWorkoutInput) => Promise<void>;
  remove: (id: number) => Promise<void>;
  reorder: (workoutId: number, direction: 'up' | 'down') => Promise<void>;
  refresh: () => Promise<void>;
}

function makeService(): WorkoutService {
  return new WorkoutService(new SQLiteWorkoutRepository(getDb()));
}

export function useWorkouts(programId: number): UseWorkoutsResult {
  const serviceRef = useRef<WorkoutService | null>(null);
  if (!serviceRef.current) serviceRef.current = makeService();
  const service = serviceRef.current;

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await service.listByProgram(programId);
      if (mountedRef.current) setWorkouts(data);
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [service, programId]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: CreateWorkoutInput) => {
    try {
      await service.create(input);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  const update = useCallback(async (id: number, input: UpdateWorkoutInput) => {
    try {
      await service.update(id, input);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  const remove = useCallback(async (id: number) => {
    try {
      await service.remove(id);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  const reorder = useCallback(async (workoutId: number, direction: 'up' | 'down') => {
    try {
      await service.reorder(programId, workoutId, direction);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, programId, refresh]);

  return { workouts, loading, error, create, update, remove, reorder, refresh };
}
