import type { ISetLogRepository } from '../repositories/ISetLogRepository';
import type { IExerciseRepository } from '../repositories/IExerciseRepository';
import type { Exercise } from '../db/types';

export interface ExerciseSetRecord {
  reps: number;
  weight: number;
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

export class ExerciseHistoryService {
  constructor(
    private setLogRepo: ISetLogRepository,
    private exerciseRepo: IExerciseRepository,
  ) {}

  async getHistory(exerciseId: number, limit = 10): Promise<ExerciseHistory> {
    const exercise = await this.exerciseRepo.findById(exerciseId);
    if (!exercise) throw new Error(`Exercise ${exerciseId} not found`);

    const setLogs = await this.setLogRepo.findByExerciseId(exerciseId);

    const groupMap = new Map<number, { date: string; sets: ExerciseSetRecord[] }>();
    for (const log of setLogs) {
      const record: ExerciseSetRecord = { reps: log.reps_done, weight: log.weight_done };
      const existing = groupMap.get(log.session_log_id);
      if (!existing) {
        groupMap.set(log.session_log_id, { date: log.completed_at, sets: [record] });
      } else {
        existing.sets.push(record);
      }
    }

    const sessions: ExerciseSession[] = [...groupMap.entries()].map(([id, { date, sets }]) => {
      const allBodyweight = sets.every(s => s.weight === 0);
      const bestSet = allBodyweight
        ? sets.reduce((b, s) => s.reps > b.reps ? s : b, sets[0])
        : sets.reduce((b, s) => s.weight > b.weight ? s : b, sets[0]);
      return { sessionLogId: id, date, sets, bestSet };
    }).sort((a, b) => b.date.localeCompare(a.date));

    return {
      exercise,
      lastSession: sessions[0] ?? null,
      recentSessions: sessions.slice(0, limit),
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
