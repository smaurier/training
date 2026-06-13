import { useState, useEffect, useRef, useCallback } from 'react';
import { ProgressionService, DashboardStats, WeeklyVolume, RecentPR, Exercise1RM } from '../services/ProgressionService';
import { SQLiteSessionLogRepository } from '../repositories/SQLiteSessionLogRepository';
import { SQLiteSetLogRepository } from '../repositories/SQLiteSetLogRepository';
import { SQLitePersonalRecordRepository } from '../repositories/SQLitePersonalRecordRepository';
import { SQLiteExerciseRepository } from '../repositories/SQLiteExerciseRepository';
import { getDb } from '../db';
import type { MacroGroupVolume } from '../services/muscleGroupUtils';

export interface UseProgressionReturn {
  stats: DashboardStats | null;
  volumeByWeek: WeeklyVolume[];
  recentPRs: RecentPR[];
  exercise1RMList: Exercise1RM[];
  volumeByMuscleGroup: MacroGroupVolume[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function makeService(): ProgressionService {
  const db = getDb();
  return new ProgressionService(
    new SQLiteSessionLogRepository(db),
    new SQLiteSetLogRepository(db),
    new SQLitePersonalRecordRepository(db),
    new SQLiteExerciseRepository(db),
  );
}

export function useProgression(): UseProgressionReturn {
  const serviceRef = useRef<ProgressionService | null>(null);
  if (serviceRef.current == null) serviceRef.current = makeService();
  const service = serviceRef.current;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [volumeByWeek, setVolumeByWeek] = useState<WeeklyVolume[]>([]);
  const [recentPRs, setRecentPRs] = useState<RecentPR[]>([]);
  const [exercise1RMList, setExercise1RMList] = useState<Exercise1RM[]>([]);
  const [volumeByMuscleGroup, setVolumeByMuscleGroup] = useState<MacroGroupVolume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [s, v, p, e, m] = await Promise.all([
        service.getDashboardStats(),
        service.getVolumeByWeek(),
        service.getRecentPRs(5),
        service.getExercise1RMList(),
        service.getVolumeByMuscleGroup(),
      ]);
      if (mountedRef.current) {
        setStats(s);
        setVolumeByWeek(v);
        setRecentPRs(p);
        setExercise1RMList(e);
        setVolumeByMuscleGroup(m);
      }
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [service]);

  useEffect(() => { refresh(); }, [refresh]);

  return { stats, volumeByWeek, recentPRs, exercise1RMList, volumeByMuscleGroup, isLoading, error, refresh };
}
