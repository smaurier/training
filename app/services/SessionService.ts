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
  calculateProgression,
  applyDeload,
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

export interface PausedSessionInfo {
  sessionLog: SessionLog;
  workoutName: string;
  setsLogged: number;
  volume: number;
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
    const existing = await this.sessionLogRepo.findAnyPaused();
    if (existing && existing.workout_id === workoutId) {
      throw new Error('Une séance est déjà en pause');
    }
    return this.sessionLogRepo.save({
      workout_id: workoutId,
      started_at: new Date().toISOString(),
      checkin_energy: checkin.checkin_energy,
      checkin_fatigue: checkin.checkin_fatigue,
      checkin_sleep: checkin.checkin_sleep,
      notes: null,
    });
  }

  async logSet(sessionLogId: number, setId: number, exerciseId: number, actual: SetActual): Promise<{ setLog: SetLog; isPR: boolean }> {
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

    let isPR = false;
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
        isPR = true;
      }
    }

    return { setLog, isPR };
  }

  async deleteSetLog(setId: number, sessionLogId: number): Promise<void> {
    await this.setLogRepo.deleteBySetAndSession(setId, sessionLogId);
  }

  async completeSession(sessionLogId: number): Promise<void> {
    await this.sessionLogRepo.complete(sessionLogId, new Date().toISOString());
  }

  async pauseSession(
    sessionLogId: number,
    position: { exerciseIdx: number; blockIdx: number; setIdx: number },
    phase: 'checkin' | 'exercise_transition' | 'running' | 'rest' | 'summary' | 'warmup',
  ): Promise<void> {
    const positionJson = JSON.stringify({
      exerciseIdx: position.exerciseIdx,
      blockIdx: position.blockIdx,
      setIdx: position.setIdx,
      phase,
    });
    await this.sessionLogRepo.pause(sessionLogId, positionJson);
  }

  async abandonSession(sessionLogId: number): Promise<void> {
    await this.sessionLogRepo.abandon(sessionLogId, new Date().toISOString());
  }

  async findAnyPausedSession(): Promise<PausedSessionInfo | null> {
    const sessionLog = await this.sessionLogRepo.findAnyPaused();
    if (!sessionLog) return null;
    const workout = await this.workoutRepo.findById(sessionLog.workout_id);
    const setLogs = await this.setLogRepo.findBySessionLogId(sessionLog.id);
    const setsLogged = setLogs.length;
    const volume = setLogs.reduce((sum, sl) => sum + sl.reps_done * sl.weight_done, 0);
    return { sessionLog, workoutName: workout?.name ?? '', setsLogged, volume };
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

      const progressionResult = calculateProgression(
        {
          current_weight: oldWeight ?? 0,
          progression_step: exercise.progression_step,
          progression_threshold: exercise.progression_threshold,
          consecutive_successes: 0,
        },
        currentSetResults,
      );

      if (progressionResult.progressed && oldWeight !== null) {
        for (const set of travailSets) {
          await this.setRepo.update(set.id, {
            reps_min: set.reps_min,
            weight: progressionResult.new_weight,
            weight_type: set.weight_type,
            rest_duration: set.rest_duration,
          });
        }
        results.push({ exerciseId: exercise.id, exerciseName: exercise.name, oldWeight, newWeight: progressionResult.new_weight, achieved: true, consecutiveSuccesses: 1, threshold: exercise.progression_threshold });
      } else if (isSessionSignificantFailure(currentSetResults) && oldWeight !== null) {
        const prevFailed = await this.checkPreviousSignificantFailure(
          sessionLogId, sessionLog.workout_id, travailSets
        );
        if (prevFailed) {
          const newWeight = applyDeload(oldWeight);
          for (const set of travailSets) {
            await this.setRepo.update(set.id, {
              reps_min: set.reps_min,
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
      .filter(s => s.id !== currentSessionLogId && s.status === 'completed')
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
