import { applyDeload } from './progression';
import type { ISettingsRepository } from '../repositories/ISettingsRepository';
import type { ISessionLogRepository } from '../repositories/ISessionLogRepository';
import type { WorkoutExerciseDetail } from './WorkoutExerciseService';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class DeloadService {
  constructor(
    private settingsRepo: ISettingsRepository,
    private sessionLogRepo: ISessionLogRepository,
  ) {}

  async getDeloadWeeks(): Promise<number> {
    const raw = await this.settingsRepo.get('deload_weeks');
    const parsed = raw ? parseInt(raw, 10) : NaN;
    return isNaN(parsed) ? 4 : parsed;
  }

  async shouldSuggestDeload(workoutId: number): Promise<boolean> {
    const deloadWeeks = await this.getDeloadWeeks();
    const thresholdMs = deloadWeeks * 7 * MS_PER_DAY;

    // last_deload_at is global (not per-workout): one deload resets the counter for all workouts
    const lastDeloadAt = await this.settingsRepo.get('last_deload_at');
    if (lastDeloadAt) {
      return Date.now() - new Date(lastDeloadAt).getTime() >= thresholdMs;
    }

    const sessions = await this.sessionLogRepo.findByWorkoutId(workoutId);
    const completed = sessions.filter(s => s.status === 'completed');
    if (completed.length === 0) return false;

    const earliest = completed.reduce((a, b) =>
      new Date(a.started_at).getTime() < new Date(b.started_at).getTime() ? a : b
    );
    return Date.now() - new Date(earliest.started_at).getTime() >= thresholdMs;
  }

  async recordDeload(date: string): Promise<void> {
    await this.settingsRepo.set('last_deload_at', date);
  }
}

export function applyDeloadToExercises(
  exercises: WorkoutExerciseDetail[],
): WorkoutExerciseDetail[] {
  return exercises.map(ex => ({
    ...ex,
    blocks: ex.blocks.map(block => ({
      ...block,
      sets: block.sets.map(set => ({
        ...set,
        weight: set.weight !== null && set.weight_type !== 'bodyweight'
          ? applyDeload(set.weight)
          : set.weight,
      })),
    })),
  }));
}
