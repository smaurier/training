import { useState, useEffect, useRef, useCallback } from 'react';
import { ExerciseHistoryService } from '../services/ExerciseHistoryService';
import { SQLiteSetLogRepository } from '../repositories/SQLiteSetLogRepository';
import { SQLiteExerciseRepository } from '../repositories/SQLiteExerciseRepository';
import { getDb } from '../db';
import type { Exercise } from '../db/types';

function makeService(): ExerciseHistoryService {
  const db = getDb();
  return new ExerciseHistoryService(
    new SQLiteSetLogRepository(db),
    new SQLiteExerciseRepository(db),
  );
}

export function useLoggedExercises() {
  const serviceRef = useRef<ExerciseHistoryService | null>(null);
  if (serviceRef.current == null) serviceRef.current = makeService();
  const service = serviceRef.current;

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await service.getLoggedExercises();
      if (mountedRef.current) setExercises(result);
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [service]);

  useEffect(() => { refresh(); }, [refresh]);

  return { exercises, isLoading, error, refresh };
}
