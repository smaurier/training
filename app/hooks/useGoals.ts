import { useState, useEffect, useRef, useCallback } from 'react';
import { GoalService } from '../services/GoalService';
import { SQLiteGoalRepository } from '../repositories/SQLiteGoalRepository';
import { SQLiteExerciseRepository } from '../repositories/SQLiteExerciseRepository';
import { getDb } from '../db';
import type { GoalWithExercise } from '../db/types';

function makeService(): GoalService {
  const db = getDb();
  return new GoalService(
    new SQLiteGoalRepository(db),
    new SQLiteExerciseRepository(db),
  );
}

export function useGoals() {
  const serviceRef = useRef<GoalService | null>(null);
  if (serviceRef.current == null) serviceRef.current = makeService();
  const service = serviceRef.current;

  const [goals, setGoals] = useState<GoalWithExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await service.getAllGoalsWithExercise();
      if (mountedRef.current) setGoals(result);
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [service]);

  useEffect(() => { refresh(); }, [refresh]);

  return { goals, isLoading, error, refresh };
}
