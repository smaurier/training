import { useState, useEffect, useRef, useCallback } from 'react';
import { ExerciseHistoryService } from '../services/ExerciseHistoryService';
import type { ExerciseHistory } from '../services/ExerciseHistoryService';
import { SQLiteSetLogRepository } from '../repositories/SQLiteSetLogRepository';
import { SQLiteExerciseRepository } from '../repositories/SQLiteExerciseRepository';
import { getDb } from '../db';

function makeService(): ExerciseHistoryService {
  const db = getDb();
  return new ExerciseHistoryService(
    new SQLiteSetLogRepository(db),
    new SQLiteExerciseRepository(db),
  );
}

export function useExerciseHistory(exerciseId: number) {
  const serviceRef = useRef<ExerciseHistoryService | null>(null);
  if (serviceRef.current == null) serviceRef.current = makeService();
  const service = serviceRef.current;

  const [history, setHistory] = useState<ExerciseHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await service.getHistory(exerciseId);
      if (mountedRef.current) setHistory(result);
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [service, exerciseId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { history, isLoading, error, refresh };
}
