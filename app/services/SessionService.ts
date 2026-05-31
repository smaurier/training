import type { SessionLog, SetLog, Workout } from '../db/types';
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
  durationSeconds?: number | null;
  distanceMeters?: number | null;
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
      duration_seconds: actual.durationSeconds ?? null,
      distance_meters: actual.distanceMeters ?? null,
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

  async getNextWorkout(programId: number): Promise<Workout | null> {
    const workouts = (await this.workoutRepo.findByProgramId(programId))
      .sort((a, b) => a.order_index - b.order_index);
    if (workouts.length === 0) return null;

    const latest = await this.sessionLogRepo.findLatestByWorkoutIds(workouts.map(w => w.id));
    if (!latest) return workouts[0];

    const lastIdx = workouts.findIndex(w => w.id === latest.workout_id);
    return workouts[(lastIdx + 1) % workouts.length];
  }

  async calculateProgressions(sessionLogId: number): Promise<ProgressionResult[]> {
    const sessionLog = await this.sessionLogRepo.findById(sessionLogId);
    if (!sessionLog) throw new Error(`SessionLog ${sessionLogId} introuvable`);

    const setLogs = await this.setLogRepo.findBySessionLogId(sessionLogId);
    const workoutExercises = await this.weRepo.findByWorkoutId(sessionLog.workout_id);
    const results: ProgressionResult[] = [];

    for (const we of workoutExercises) {
      const exercise = await this.exerciseRepo.findById(we.exercise_id);
      if (!exercise) continue;

      const blocks = await this.blockRepo.findByWorkoutExerciseId(we.id);
      const workBlocks = blocks.filter(b => b.is_work_block === 1);
      if (workBlocks.length === 0) continue;

      const workSets: import('../db/types').Set[] = [];
      for (const block of workBlocks) {
        const sets = await this.setRepo.findByBlockId(block.id);
        workSets.push(...sets);
      }
      if (workSets.length === 0) continue;

      const workSetIds = workSets.map(s => s.id);
      const workSetLogs = setLogs.filter(sl => workSetIds.includes(sl.set_id));
      if (workSetLogs.length === 0) {
        results.push({ exerciseId: exercise.id, exerciseName: exercise.name, oldWeight: workSets[0].weight, newWeight: workSets[0].weight, achieved: false, consecutiveSuccesses: 0, threshold: exercise.progression_threshold });
        continue;
      }

      const allAchieved = this.checkAllWorkSetsAchieved(workSets, workSetLogs);
      if (!allAchieved) {
        results.push({ exerciseId: exercise.id, exerciseName: exercise.name, oldWeight: workSets[0].weight, newWeight: workSets[0].weight, achieved: false, consecutiveSuccesses: 0, threshold: exercise.progression_threshold });
        continue;
      }

      // Compter les séances réussies consécutives (inclut la courante)
      const pastSessions = (await this.sessionLogRepo.findByWorkoutId(sessionLog.workout_id))
        .filter(s => s.id !== sessionLogId && s.ended_at !== null)
        .sort((a, b) => b.started_at.localeCompare(a.started_at));

      let consecutiveSuccesses = 1;
      for (const past of pastSessions.slice(0, exercise.progression_threshold - 1)) {
        const pastLogs = await this.setLogRepo.findBySessionLogId(past.id);
        const pastWorkLogs = pastLogs.filter(sl => workSetIds.includes(sl.set_id));
        if (pastWorkLogs.length === 0 || !this.checkAllWorkSetsAchieved(workSets, pastWorkLogs)) break;
        consecutiveSuccesses++;
      }

      const oldWeight = workSets[0].weight;

      if (consecutiveSuccesses >= exercise.progression_threshold) {
        for (const set of workSets) {
          if (set.weight !== null) {
            await this.setRepo.update(set.id, {
              reps_min: set.reps_min,
              reps_max: set.reps_max,
              weight: set.weight + exercise.progression_step,
              weight_type: set.weight_type,
              rest_duration: set.rest_duration,
            });
          }
        }
        const newWeight = oldWeight !== null ? oldWeight + exercise.progression_step : null;
        results.push({ exerciseId: exercise.id, exerciseName: exercise.name, oldWeight, newWeight, achieved: true, consecutiveSuccesses, threshold: exercise.progression_threshold });
      } else {
        results.push({ exerciseId: exercise.id, exerciseName: exercise.name, oldWeight, newWeight: oldWeight, achieved: false, consecutiveSuccesses, threshold: exercise.progression_threshold });
      }
    }

    return results;
  }

  private checkAllWorkSetsAchieved(
    workSets: import('../db/types').Set[],
    setLogs: import('../db/types').SetLog[]
  ): boolean {
    for (const set of workSets) {
      const log = setLogs.find(sl => sl.set_id === set.id);
      if (!log || log.reps_done < set.reps_max) return false;
    }
    return true;
  }
}
