// hooks/useExercises.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { Exercise } from '../db/types';
import { ExerciseService, CreateExerciseInput } from '../services/ExerciseService';
import { SQLiteExerciseRepository } from '../repositories/SQLiteExerciseRepository';
import { getDb } from '../db';

export interface UseExercisesResult {
  exercises: Exercise[];
  loading: boolean;
  error: string | null;
  create: (input: CreateExerciseInput) => Promise<void>;
  refresh: () => Promise<void>;
}

function makeService(): ExerciseService {
  return new ExerciseService(new SQLiteExerciseRepository(getDb()));
}

export function useExercises(): UseExercisesResult {
  const serviceRef = useRef<ExerciseService | null>(null);
  if (!serviceRef.current) {
    serviceRef.current = makeService();
  }
  const service = serviceRef.current;

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await service.listAll();
      if (mountedRef.current) setExercises(data);
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (input: CreateExerciseInput): Promise<void> => {
    try {
      await service.create(input);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  return { exercises, loading, error, create, refresh };
}
