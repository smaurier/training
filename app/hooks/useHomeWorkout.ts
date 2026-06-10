import { useState, useCallback, useEffect, useRef } from 'react';
import { SessionService } from '../services/SessionService';
import { SQLiteSessionLogRepository } from '../repositories/SQLiteSessionLogRepository';
import { SQLiteSetLogRepository } from '../repositories/SQLiteSetLogRepository';
import { SQLitePersonalRecordRepository } from '../repositories/SQLitePersonalRecordRepository';
import { SQLiteWorkoutRepository } from '../repositories/SQLiteWorkoutRepository';
import { SQLiteWorkoutExerciseRepository } from '../repositories/SQLiteWorkoutExerciseRepository';
import { SQLiteBlockRepository } from '../repositories/SQLiteBlockRepository';
import { SQLiteSetRepository } from '../repositories/SQLiteSetRepository';
import { SQLiteExerciseRepository } from '../repositories/SQLiteExerciseRepository';
import { SQLiteProgramRepository } from '../repositories/SQLiteProgramRepository';
import { getDb } from '../db';
import type { Workout } from '../db/types';

export interface HomeWorkoutState {
  workouts: Workout[];
  suggestedWorkout: Workout | null;
  selectedWorkout: Workout | null;
  lastDates: Map<number, string | null>;
  isSuggestion: boolean;
  loading: boolean;
  hasActiveProgram: boolean;
  error: string | null;
  selectWorkout: (w: Workout) => void;
  refresh: () => Promise<void>;
}

function makeSessionService(): SessionService {
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

export function useHomeWorkout(): HomeWorkoutState {
  const serviceRef = useRef<SessionService | null>(null);
  if (serviceRef.current == null) serviceRef.current = makeSessionService();

  // Fix 1: refresh ID ref for unmount guard / stale-call discard
  const refreshIdRef = useRef(0);

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [suggestedWorkout, setSuggestedWorkout] = useState<Workout | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [lastDates, setLastDates] = useState<Map<number, string | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [hasActiveProgram, setHasActiveProgram] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const id = ++refreshIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const db = getDb();
      const programRepo = new SQLiteProgramRepository(db);
      const programs = await programRepo.findAll();
      if (refreshIdRef.current !== id) return;
      const active = programs.find(p => p.is_active === 1);
      if (!active) {
        setHasActiveProgram(false);
        setWorkouts([]);
        setSuggestedWorkout(null);
        setSelectedWorkout(null);
        setLastDates(new Map());
        setLoading(false);
        return;
      }
      setHasActiveProgram(true);

      const workoutRepo = new SQLiteWorkoutRepository(db);
      const allWorkouts = (await workoutRepo.findByProgramId(active.id))
        .sort((a, b) => a.order_index - b.order_index);
      if (refreshIdRef.current !== id) return;
      setWorkouts(allWorkouts);

      const suggested = await serviceRef.current!.getNextWorkout(active.id);
      if (refreshIdRef.current !== id) return;
      setSuggestedWorkout(suggested);
      setSelectedWorkout(suggested);

      const sessionLogRepo = new SQLiteSessionLogRepository(db);
      const dates = await sessionLogRepo.findLatestDatesPerWorkout(allWorkouts.map(w => w.id));
      if (refreshIdRef.current !== id) return;
      setLastDates(dates);
    } catch (e) {
      if (refreshIdRef.current !== id) return;
      setError(e instanceof Error ? e.message : 'Erreur chargement séance');
    } finally {
      // Only clear loading if this call is still the latest
      if (refreshIdRef.current === id) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const selectWorkout = useCallback((w: Workout) => {
    setSelectedWorkout(w);
  }, []);

  // Fix 2: null guard — false when both are null/undefined
  const isSuggestion = selectedWorkout != null && selectedWorkout.id === suggestedWorkout?.id;

  return {
    workouts,
    suggestedWorkout,
    selectedWorkout,
    lastDates,
    isSuggestion,
    loading,
    hasActiveProgram,
    error,
    selectWorkout,
    refresh,
  };
}
