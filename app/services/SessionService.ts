import type { SessionLog, SetLog, Workout, Set as DBSet } from '../db/types';
import { ISessionLogRepository } from '../repositories/ISessionLogRepository';
import { ISetLogRepository } from '../repositories/ISetLogRepository';
import { IPersonalRecordRepository } from '../repositories/IPersonalRecordRepository';
import { IWorkoutRepository } from '../repositories/IWorkoutRepository';
import { IWorkoutExerciseRepository } from '../repositories/IWorkoutExerciseRepository';
import { IBlockRepository } from '../repositories/IBlockRepository';
import { ISetRepository } from '../repositories/ISetRepository';
import { IExerciseRepository } from '../repositories/IExerciseRepository';
import {
  applyProgression,
  applyDeload,
  isSessionFullSuccess,
  isSessionSignificantFailure,
  SetResult,
} from './progression';

export type CheckIn = Pick<SessionLog, 'checkin_energy' | 'checkin_fatigue' | 'checkin_sleep'>;

export interface SetActual {
  repsDone: number;
  weightDone: number;
  rpe: number | null;
  durationSeconds?: number | null;
  distanceMeters?: number | null;
}

export interface LastSetLog {
  repsDone: number;
  weightDone: number;
  durationSeconds: number | null;
  distanceMeters: number | null;
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

  async setStartingWeight(workoutExerciseId: number, weight: number): Promise<void> {
    const blocks = await this.blockRepo.findByWorkoutExerciseId(workoutExerciseId);
    const travailBlocks = blocks.filter(b => b.is_work_block === 1 && b.name === 'Travail');
    for (const block of travailBlocks) {
      const sets = await this.setRepo.findByBlockId(block.id);
      for (const set of sets) {
        await this.setRepo.update(set.id, {
          reps_min: set.reps_min,
          reps_max: set.reps_max,
          weight,
          weight_type: set.weight_type,
          rest_duration: set.rest_duration,
        });
      }
    }
  }

  async getLastSetLog(setId: number): Promise<LastSetLog | null> {
    const logs = await this.setLogRepo.findBySetId(setId);
    if (logs.length === 0) return null;
    const last = logs[0];
    return {
      repsDone: last.reps_done,
      weightDone: last.weight_done,
      durationSeconds: last.duration_seconds,
      distanceMeters: last.distance_meters,
    };
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
      const travailBlocks = blocks.filter(b => b.is_work_block === 1 && b.name === 'Travail');
      if (travailBlocks.length === 0) continue;

      const travailSets: DBSet[] = [];
      for (const block of travailBlocks) {
        const sets = await this.setRepo.findByBlockId(block.id);
        travailSets.push(...sets);
      }
      if (travailSets.length === 0) continue;

      const travailSetIds = travailSets.map(s => s.id);
      const currentLogs = setLogs.filter(sl => travailSetIds.includes(sl.set_id));
      const oldWeight = travailSets[0].weight;

      if (currentLogs.length === 0) {
        results.push({ exerciseId: exercise.id, exerciseName: exercise.name, oldWeight, newWeight: oldWeight, achieved: false, consecutiveSuccesses: 0, threshold: 1 });
        continue;
      }

      const travailSetMap = new Map(travailSets.map(s => [s.id, s]));
      const currentSetResults: SetResult[] = currentLogs.map(log => ({
        reps_done: log.reps_done,
        reps_min: travailSetMap.get(log.set_id)?.reps_min ?? log.reps_done,
      }));

      if (isSessionFullSuccess(currentSetResults) && oldWeight !== null) {
        const newWeight = applyProgression(oldWeight);
        for (const set of travailSets) {
          await this.setRepo.update(set.id, {
            reps_min: set.reps_min,
            reps_max: set.reps_max,
            weight: newWeight,
            weight_type: set.weight_type,
            rest_duration: set.rest_duration,
          });
        }
        results.push({ exerciseId: exercise.id, exerciseName: exercise.name, oldWeight, newWeight, achieved: true, consecutiveSuccesses: 1, threshold: 1 });
      } else if (isSessionSignificantFailure(currentSetResults) && oldWeight !== null) {
        const prevFailed = await this.checkPreviousSignificantFailure(
          sessionLogId, sessionLog.workout_id, travailSets
        );
        if (prevFailed) {
          const newWeight = applyDeload(oldWeight);
          for (const set of travailSets) {
            await this.setRepo.update(set.id, {
              reps_min: set.reps_min,
              reps_max: set.reps_max,
              weight: newWeight,
              weight_type: set.weight_type,
              rest_duration: set.rest_duration,
            });
          }
          results.push({ exerciseId: exercise.id, exerciseName: exercise.name, oldWeight, newWeight, achieved: false, consecutiveSuccesses: 0, threshold: 1 });
        } else {
          results.push({ exerciseId: exercise.id, exerciseName: exercise.name, oldWeight, newWeight: oldWeight, achieved: false, consecutiveSuccesses: 0, threshold: 1 });
        }
      } else {
        results.push({ exerciseId: exercise.id, exerciseName: exercise.name, oldWeight, newWeight: oldWeight, achieved: false, consecutiveSuccesses: 0, threshold: 1 });
      }
    }

    return results;
  }

  private async checkPreviousSignificantFailure(
    currentSessionLogId: number,
    workoutId: number,
    travailSets: DBSet[]
  ): Promise<boolean> {
    const pastSessions = (await this.sessionLogRepo.findByWorkoutId(workoutId))
      .filter(s => s.id !== currentSessionLogId && s.ended_at !== null)
      .sort((a, b) => b.started_at.localeCompare(a.started_at));

    if (pastSessions.length === 0) return false;

    const travailSetIds = travailSets.map(s => s.id);
    const prevLogs = await this.setLogRepo.findBySessionLogId(pastSessions[0].id);
    const prevTravailLogs = prevLogs.filter(sl => travailSetIds.includes(sl.set_id));

    if (prevTravailLogs.length === 0) return false;

    const setsMap = new Map(travailSets.map(s => [s.id, s]));
    const prevSetResults: SetResult[] = prevTravailLogs.map(log => ({
      reps_done: log.reps_done,
      reps_min: setsMap.get(log.set_id)?.reps_min ?? log.reps_done,
    }));

    return isSessionSignificantFailure(prevSetResults);
  }
}
