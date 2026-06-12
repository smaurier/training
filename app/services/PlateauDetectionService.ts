import type { ISetLogRepository } from '../repositories/ISetLogRepository';
import type { ISessionLogRepository } from '../repositories/ISessionLogRepository';
import type { IWorkoutExerciseRepository } from '../repositories/IWorkoutExerciseRepository';
import type { IExerciseRepository } from '../repositories/IExerciseRepository';

export interface PlateauResult {
  exerciseId: number;
  exerciseName: string;
  currentWeight: number;
  sessionsCount: number;
}

const PLATEAU_THRESHOLD = 3;

export class PlateauDetectionService {
  constructor(
    private setLogRepo: ISetLogRepository,
    private sessionLogRepo: ISessionLogRepository,
    private workoutExerciseRepo: IWorkoutExerciseRepository,
    private exerciseRepo: IExerciseRepository,
  ) {}

  async detectPlateaus(sessionLogId: number): Promise<PlateauResult[]> {
    const sessionLog = await this.sessionLogRepo.findById(sessionLogId);
    if (!sessionLog) return [];

    const allSessions = await this.sessionLogRepo.findByWorkoutId(sessionLog.workout_id);
    const completedSessions = allSessions
      .filter(s => s.status === 'completed')
      .sort((a, b) => b.started_at.localeCompare(a.started_at));

    if (completedSessions.length < PLATEAU_THRESHOLD) return [];

    const last3Ids = new Set(
      completedSessions.slice(0, PLATEAU_THRESHOLD).map(s => s.id),
    );

    const workoutExercises = await this.workoutExerciseRepo.findByWorkoutId(sessionLog.workout_id);
    const plateaus: PlateauResult[] = [];

    for (const we of workoutExercises) {
      const exercise = await this.exerciseRepo.findById(we.exercise_id);
      if (!exercise) continue;

      const setLogs = await this.setLogRepo.findByExerciseId(we.exercise_id);

      const maxWeightPerSession = new Map<number, number>();
      for (const log of setLogs) {
        if (!last3Ids.has(log.session_log_id)) continue;
        const current = maxWeightPerSession.get(log.session_log_id) ?? 0;
        maxWeightPerSession.set(log.session_log_id, Math.max(current, log.weight_done));
      }

      if (maxWeightPerSession.size < PLATEAU_THRESHOLD) continue;

      const weights = [...maxWeightPerSession.values()];
      const referenceWeight = weights[0];

      if (referenceWeight === 0) continue;
      if (!weights.every(w => w === referenceWeight)) continue;

      plateaus.push({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        currentWeight: referenceWeight,
        sessionsCount: PLATEAU_THRESHOLD,
      });
    }

    return plateaus;
  }
}
