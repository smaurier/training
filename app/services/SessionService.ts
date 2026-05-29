import type { SessionLog, SetLog } from '../db/types';
import { ISessionLogRepository } from '../repositories/ISessionLogRepository';
import { ISetLogRepository } from '../repositories/ISetLogRepository';
import { IPersonalRecordRepository } from '../repositories/IPersonalRecordRepository';
import { IWorkoutRepository } from '../repositories/IWorkoutRepository';
import { IWorkoutExerciseRepository } from '../repositories/IWorkoutExerciseRepository';
import { IBlockRepository } from '../repositories/IBlockRepository';
import { ISetRepository } from '../repositories/ISetRepository';
import { IExerciseRepository } from '../repositories/IExerciseRepository';

export type CheckIn = Pick<SessionLog, 'checkin_energy' | 'checkin_fatigue' | 'checkin_sleep'>;

export interface SetActual {
  repsDone: number;
  weightDone: number;
  rpe: number | null;
}

export interface ProgressionResult {
  exerciseId: number;
  exerciseName: string;
  oldWeight: number | null;
  newWeight: number | null;
  achieved: boolean;
  consecutiveSuccesses: number;
  threshold: number;
}

export class SessionService {
  constructor(
    private sessionLogRepo: ISessionLogRepository,
    private setLogRepo: ISetLogRepository,
    private prRepo: IPersonalRecordRepository,
    private workoutRepo: IWorkoutRepository,
    private weRepo: IWorkoutExerciseRepository,
    private blockRepo: IBlockRepository,
    private setRepo: ISetRepository,
    private exerciseRepo: IExerciseRepository,
  ) {}

  async startSession(workoutId: number, checkin: CheckIn): Promise<SessionLog> {
    return this.sessionLogRepo.save({
      workout_id: workoutId,
      started_at: new Date().toISOString(),
      checkin_energy: checkin.checkin_energy,
      checkin_fatigue: checkin.checkin_fatigue,
      checkin_sleep: checkin.checkin_sleep,
      notes: null,
    });
  }

  async logSet(sessionLogId: number, setId: number, exerciseId: number, actual: SetActual): Promise<SetLog> {
    const setLog = await this.setLogRepo.save({
      session_log_id: sessionLogId,
      set_id: setId,
      exercise_id: exerciseId,
      reps_done: actual.repsDone,
      weight_done: actual.weightDone,
      rpe: actual.rpe,
      completed_at: new Date().toISOString(),
    });

    if (actual.weightDone > 0 && actual.repsDone > 0) {
      const estimated1RM = actual.weightDone * (1 + actual.repsDone / 30);
      const currentBest = await this.prRepo.findBestByExerciseId(exerciseId);
      if (!currentBest || estimated1RM > currentBest.estimated_1rm) {
        await this.prRepo.save({
          exercise_id: exerciseId,
          weight: actual.weightDone,
          reps: actual.repsDone,
          estimated_1rm: estimated1RM,
          achieved_at: new Date().toISOString(),
          session_log_id: sessionLogId,
        });
      }
    }

    return setLog;
  }

  async completeSession(sessionLogId: number): Promise<void> {
    await this.sessionLogRepo.complete(sessionLogId, new Date().toISOString());
  }

  // getNextWorkout and calculateProgressions added in Tasks 5 & 6
}
