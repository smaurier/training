import { useState, useEffect, useRef, useCallback } from 'react';
import { HistoryService, SessionSummary } from '../services/HistoryService';
import { SQLiteSessionLogRepository } from '../repositories/SQLiteSessionLogRepository';
import { SQLiteSetLogRepository } from '../repositories/SQLiteSetLogRepository';
import { SQLiteWorkoutRepository } from '../repositories/SQLiteWorkoutRepository';
import { SQLiteExerciseRepository } from '../repositories/SQLiteExerciseRepository';
import { getDb } from '../db';

export interface HistorySection {
  title: string; // "Mai 2026 · 3 séances"
  data: SessionSummary[];
}

export interface UseHistoryReturn {
  sections: HistorySection[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function makeService(): HistoryService {
  const db = getDb();
  return new HistoryService(
    new SQLiteSessionLogRepository(db),
    new SQLiteSetLogRepository(db),
    new SQLiteWorkoutRepository(db),
    new SQLiteExerciseRepository(db),
  );
}

function groupByMonth(sessions: SessionSummary[]): HistorySection[] {
  const map = new Map<string, SessionSummary[]>();

  for (const session of sessions) {
    const key = session.startedAt.slice(0, 7); // "2026-05"
    const existing = map.get(key);
    if (existing) {
      existing.push(session);
    } else {
      map.set(key, [session]);
    }
  }

  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0])) // DESC: most recent first
    .map(([key, data]) => {
      const label = new Date(key + '-01T12:00:00').toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric',
      });
      const capitalized = label.charAt(0).toUpperCase() + label.slice(1);
      const count = data.length;
      const seances = count === 1 ? '1 séance' : `${count} séances`;
      const title = `${capitalized} · ${seances}`;
      return { title, data };
    });
}

export function useHistory(): UseHistoryReturn {
  const serviceRef = useRef<HistoryService | null>(null);
  if (!serviceRef.current) serviceRef.current = makeService();
  const service = serviceRef.current;

  const [sections, setSections] = useState<HistorySection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await service.getSessionList();
      if (mountedRef.current) setSections(groupByMonth(data));
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [service]);

  useEffect(() => { refresh(); }, [refresh]);

  return { sections, isLoading, error, refresh };
}
