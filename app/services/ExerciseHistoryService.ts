import type { ISetLogRepository } from '../repositories/ISetLogRepository';
import type { IExerciseRepository } from '../repositories/IExerciseRepository';
import type { Exercise } from '../db/types';

export interface ExerciseSetRecord {
  reps: number;
  weight: number;
  duration_seconds?: number | null;
  distance_meters?: number | null;
}

export interface ExerciseSession {
  sessionLogId: number;
  date: string;
  sets: ExerciseSetRecord[];
  bestSet: ExerciseSetRecord;
}

export interface ExerciseHistory {
  exercise: Exercise;
  lastSession: ExerciseSession | null;
  recentSessions: ExerciseSession[];
}

function computeBestSet(sets: ExerciseSetRecord[], isCardio: boolean): ExerciseSetRecord {
  if (isCardio) {
    const withDistance = sets.filter((s): s is ExerciseSetRecord & { distance_meters: number } =>
      s.distance_meters != null && s.distance_meters > 0
    );
    if (withDistance.length > 0)
      return withDistance.reduce((b, s) => s.distance_meters > b.distance_meters ? s : b);
    const withDuration = sets.filter((s): s is ExerciseSetRecord & { duration_seconds: number } =>
      s.duration_seconds != null && s.duration_seconds > 0
    );
    if (withDuration.length > 0)
      return withDuration.reduce((b, s) => s.duration_seconds > b.duration_seconds ? s : b);
    return sets[0];
  }
  const allBodyweight = sets.every(s => s.weight === 0);
  return allBodyweight
    ? sets.reduce((b, s) => s.reps > b.reps ? s : b, sets[0])
    : sets.reduce((b, s) => s.weight > b.weight ? s : b, sets[0]);
}

export class ExerciseHistoryService {
  constructor(
    private setLogRepo: ISetLogRepository,
    private exerciseRepo: IExerciseRepository,
  ) {}

  async getHistory(exerciseId: number, limit?: number): Promise<ExerciseHistory> {
    const exercise = await this.exerciseRepo.findById(exerciseId);
    if (!exercise) throw new Error(`Exercise ${exerciseId} not found`);

    const setLogs = await this.setLogRepo.findByExerciseId(exerciseId);
    const isCardio = exercise.type === 'cardio';

    const groupMap = new Map<number, { date: string; sets: ExerciseSetRecord[] }>();
    for (const log of setLogs) {
      const record: ExerciseSetRecord = {
        reps: log.reps_done,
        weight: log.weight_done,
        duration_seconds: log.duration_seconds,
        distance_meters: log.distance_meters,
      };
      const existing = groupMap.get(log.session_log_id);
      if (!existing) {
        groupMap.set(log.session_log_id, { date: log.completed_at, sets: [record] });
      } else {
        existing.sets.push(record);
      }
    }

    const sessions: ExerciseSession[] = [...groupMap.entries()].map(([id, { date, sets }]) => ({
      sessionLogId: id,
      date,
      sets,
      bestSet: computeBestSet(sets, isCardio),
    })).sort((a, b) => b.date.localeCompare(a.date));

    return {
      exercise,
      lastSession: sessions[0] ?? null,
      recentSessions: limit !== undefined ? sessions.slice(0, limit) : sessions,
    };
  }

  async getLoggedExercises(): Promise<Exercise[]> {
    const loggedIds = new Set(await this.setLogRepo.findDistinctExerciseIds());
    const all = await this.exerciseRepo.findAll();
    return all
      .filter(e => loggedIds.has(e.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }
}
