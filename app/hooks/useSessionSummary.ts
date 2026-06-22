import { useState, useEffect, useCallback } from 'react';
import { getDb } from '@/db';
import { makeSessionService } from '@/services/makeSessionService';
import { PlateauDetectionService } from '@/services/PlateauDetectionService';
import type { PlateauResult } from '@/services/PlateauDetectionService';
import { DeloadService } from '@/services/DeloadService';
import { SQLiteSettingsRepository } from '@/repositories/SQLiteSettingsRepository';
import { SQLiteSessionLogRepository } from '@/repositories/SQLiteSessionLogRepository';
import { SQLiteSetLogRepository } from '@/repositories/SQLiteSetLogRepository';
import { SQLiteWorkoutExerciseRepository } from '@/repositories/SQLiteWorkoutExerciseRepository';
import { SQLiteExerciseRepository } from '@/repositories/SQLiteExerciseRepository';
import type { WorkoutExerciseDetail } from '@/services/WorkoutExerciseService';
import type { SessionPhase } from '@/hooks/useSession';
import type { SessionTagSlug } from '@/services/sessionTagsUtils';

export interface UseSessionSummaryResult {
  summaryDurationSeconds: number;
  plateaus: PlateauResult[];
  rpeLabel: 'Facile' | 'Normal' | 'Difficile' | null;
  prevSummary: { volume: number; sets: number } | null;
  selectedMood: 1 | 2 | 3 | undefined;
  handleMoodSelect: (mood: 1 | 2 | 3) => Promise<void>;
  selectedTags: SessionTagSlug[];
  handleTagToggle: (slug: SessionTagSlug) => void;
  sessionNotes: string;
  setSessionNotes: (v: string) => void;
  emptyCardioSetLogCount: number;
  handleSaveCardioData: (
    durationSeconds: number | null,
    distanceMeters: number | null,
    rpe: number | null,
  ) => Promise<void>;
}

export function useSessionSummary(
  sessionLogId: number | null,
  workoutId: number,
  phase: SessionPhase,
  exercises: WorkoutExerciseDetail[],
  isDeloadSession: boolean,
  sessionStartedAt: number | null,
): UseSessionSummaryResult {
  const isActive = phase === 'summary' && sessionLogId !== null;

  const [summaryDurationSeconds, setSummaryDurationSeconds] = useState(0);
  useEffect(() => {
    if (isActive && sessionStartedAt) {
      setSummaryDurationSeconds(Math.round((Date.now() - sessionStartedAt) / 1000));
    }
  }, [isActive, sessionStartedAt]);

  const [plateaus, setPlateaus] = useState<PlateauResult[]>([]);
  useEffect(() => {
    if (!isActive) return;
    const db = getDb();
    new PlateauDetectionService(
      new SQLiteSetLogRepository(db),
      new SQLiteSessionLogRepository(db),
      new SQLiteWorkoutExerciseRepository(db),
      new SQLiteExerciseRepository(db),
    ).detectPlateaus(sessionLogId!).then(setPlateaus).catch(console.error);
  }, [isActive, sessionLogId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [rpeLabel, setRpeLabel] = useState<'Facile' | 'Normal' | 'Difficile' | null>(null);
  useEffect(() => {
    if (!isActive) return;
    makeSessionService().getSessionRPELabel(sessionLogId!).then(setRpeLabel).catch(console.error);
  }, [isActive, sessionLogId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [prevSummary, setPrevSummary] = useState<{ volume: number; sets: number } | null>(null);
  useEffect(() => {
    if (!isActive) return;
    makeSessionService()
      .getPreviousSessionSummary(workoutId, sessionLogId!)
      .then(setPrevSummary)
      .catch(console.error);
  }, [isActive, sessionLogId, workoutId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isActive || !isDeloadSession) return;
    const db = getDb();
    new DeloadService(
      new SQLiteSettingsRepository(db),
      new SQLiteSessionLogRepository(db),
    ).recordDeload(new Date().toISOString()).catch(console.error);
  }, [isActive, isDeloadSession]); // eslint-disable-line react-hooks/exhaustive-deps

  const [selectedMood, setSelectedMood] = useState<1 | 2 | 3 | undefined>(undefined);
  const handleMoodSelect = useCallback(async (mood: 1 | 2 | 3) => {
    setSelectedMood(mood);
    if (!sessionLogId) return;
    await makeSessionService().saveMoodAfter(sessionLogId, mood);
  }, [sessionLogId]);

  const [selectedTags, setSelectedTags] = useState<SessionTagSlug[]>([]);
  const [sessionNotes, setSessionNotes] = useState('');
  const handleTagToggle = useCallback((slug: SessionTagSlug) => {
    setSelectedTags(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  }, []);

  const [emptyCardioSetLogIds, setEmptyCardioSetLogIds] = useState<number[]>([]);
  useEffect(() => {
    if (!isActive) return;
    const cardioExerciseIds = new Set(
      exercises
        .filter(we => we.exercise.type === 'cardio')
        .map(we => we.exercise.id)
    );
    if (cardioExerciseIds.size === 0) return;
    new SQLiteSetLogRepository(getDb())
      .findBySessionLogId(sessionLogId!)
      .then(logs => {
        const empty = logs.filter(
          l => cardioExerciseIds.has(l.exercise_id) &&
               l.duration_seconds == null &&
               l.distance_meters == null
        );
        setEmptyCardioSetLogIds(empty.map(l => l.id));
      })
      .catch(console.error);
  }, [isActive, sessionLogId, exercises]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveCardioData = useCallback(async (
    durationSeconds: number | null,
    distanceMeters: number | null,
    rpe: number | null,
  ) => {
    if (emptyCardioSetLogIds.length === 0) return;
    await makeSessionService().saveCardioData(
      emptyCardioSetLogIds[0],
      durationSeconds,
      distanceMeters,
      rpe,
    );
    setEmptyCardioSetLogIds([]);
  }, [emptyCardioSetLogIds]);

  return {
    summaryDurationSeconds,
    plateaus,
    rpeLabel,
    prevSummary,
    selectedMood,
    handleMoodSelect,
    selectedTags,
    handleTagToggle,
    sessionNotes,
    setSessionNotes,
    emptyCardioSetLogCount: emptyCardioSetLogIds.length,
    handleSaveCardioData,
  };
}
