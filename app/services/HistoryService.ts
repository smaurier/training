import type { ISessionLogRepository } from '../repositories/ISessionLogRepository';
import type { ISetLogRepository } from '../repositories/ISetLogRepository';
import type { IWorkoutRepository } from '../repositories/IWorkoutRepository';
import type { IExerciseRepository } from '../repositories/IExerciseRepository';

export interface SessionSummary {
  id: number;
  workoutName: string;
  startedAt: string;
  durationSeconds: number;
  totalSets: number;
}

export interface SetLogSummary {
  repsDone: number;
  weightDone: number;
  rpe: number | null;
}

export interface ExerciseHistory {
  exerciseId: number;
  exerciseName: string;
  sets: SetLogSummary[];
}

export interface SessionDetail {
  id: number;
  workoutName: string;
  startedAt: string;
  durationSeconds: number;
  totalSets: number;
  checkinEnergy: 1 | 2 | 3 | null;
  checkinFatigue: 1 | 2 | 3 | null;
  checkinSleep: 1 | 2 | 3 | null;
  exercises: ExerciseHistory[];
}

export class HistoryService {
  constructor(
    private sessionLogRepo: ISessionLogRepository,
    private setLogRepo: ISetLogRepository,
    private workoutRepo: IWorkoutRepository,
    private exerciseRepo: IExerciseRepository,
  ) {}

  async getSessionList(): Promise<SessionSummary[]> {
    const sessions = await this.sessionLogRepo.findAll();
    if (sessions.length === 0) return [];

    const workoutIds = [...new Set(sessions.map(s => s.workout_id))];
    const workouts = await Promise.all(workoutIds.map(id => this.workoutRepo.findById(id)));
    const workoutMap = new Map<number, string>();
    workoutIds.forEach((id, i) => {
      workoutMap.set(id, workouts[i]?.name ?? 'Séance inconnue');
    });

    const sessionIds = sessions.map(s => s.id);
    const counts = await this.setLogRepo.countBySessionLogIds(sessionIds);

    return sessions.map(s => ({
      id: s.id,
      workoutName: workoutMap.get(s.workout_id) ?? 'Séance inconnue',
      startedAt: s.started_at,
      durationSeconds: s.ended_at
        ? Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000)
        : 0,
      totalSets: counts[s.id] ?? 0,
    }));
  }

  async getSessionDetail(sessionLogId: number): Promise<SessionDetail | null> {
    const session = await this.sessionLogRepo.findById(sessionLogId);
    if (!session) return null;

    const workout = await this.workoutRepo.findById(session.workout_id);
    const setLogs = await this.setLogRepo.findBySessionLogId(sessionLogId);

    const exerciseIds = [...new Set(setLogs.map(s => s.exercise_id))];
    const exercises = await Promise.all(exerciseIds.map(id => this.exerciseRepo.findById(id)));
    const exerciseMap = new Map<number, string>();
    exerciseIds.forEach((id, i) => {
      exerciseMap.set(id, exercises[i]?.name ?? 'Exercice inconnu');
    });

    const sortedLogs = [...setLogs].sort((a, b) => a.completed_at.localeCompare(b.completed_at));
    const groups = new Map<number, { firstAt: string; sets: SetLogSummary[] }>();
    for (const log of sortedLogs) {
      const entry: SetLogSummary = { repsDone: log.reps_done, weightDone: log.weight_done, rpe: log.rpe };
      const existing = groups.get(log.exercise_id);
      if (existing) {
        existing.sets.push(entry);
      } else {
        groups.set(log.exercise_id, { firstAt: log.completed_at, sets: [entry] });
      }
    }

    const exerciseHistories: ExerciseHistory[] = [...groups.entries()]
      .sort((a, b) => a[1].firstAt.localeCompare(b[1].firstAt))
      .map(([exerciseId, { sets }]) => ({
        exerciseId,
        exerciseName: exerciseMap.get(exerciseId) ?? 'Exercice inconnu',
        sets,
      }));

    const durationSeconds = session.ended_at
      ? Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000)
      : 0;

    return {
      id: session.id,
      workoutName: workout?.name ?? 'Séance inconnue',
      startedAt: session.started_at,
      durationSeconds,
      totalSets: setLogs.length,
      checkinEnergy: session.checkin_energy,
      checkinFatigue: session.checkin_fatigue,
      checkinSleep: session.checkin_sleep,
      exercises: exerciseHistories,
    };
  }
}
