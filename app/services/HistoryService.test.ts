import { InMemorySessionLogRepository } from '../repositories/InMemorySessionLogRepository';
import { InMemorySetLogRepository } from '../repositories/InMemorySetLogRepository';
import { InMemoryWorkoutRepository } from '../repositories/InMemoryWorkoutRepository';
import { InMemoryExerciseRepository } from '../repositories/InMemoryExerciseRepository';
import { InMemoryPersonalRecordRepository } from '../repositories/InMemoryPersonalRecordRepository';
import { HistoryService } from './HistoryService';

function makeService() {
  const sessionLogRepo = new InMemorySessionLogRepository();
  const setLogRepo = new InMemorySetLogRepository();
  const workoutRepo = new InMemoryWorkoutRepository();
  const exerciseRepo = new InMemoryExerciseRepository();
  const personalRecordRepo = new InMemoryPersonalRecordRepository();
  const service = new HistoryService(sessionLogRepo, setLogRepo, workoutRepo, exerciseRepo, personalRecordRepo);
  return { service, sessionLogRepo, setLogRepo, workoutRepo, exerciseRepo, personalRecordRepo };
}

const baseSessionDto = {
  started_at: '2026-01-01T10:00:00.000Z',
  checkin_energy: 3 as const,
  checkin_fatigue: 1 as const,
  checkin_sleep: 3 as const,
  notes: null,
};

const baseExerciseDto = {
  name: 'Développé couché',
  type: 'musculation' as const,
  muscle_groups: '[]',
  technical_notes: null,
  description: null,
  is_custom: 0 as const,
  progression_step: 2.5,
  progression_threshold: 1,
};

describe('HistoryService', () => {
  describe('getSessionList', () => {
    it('retourne [] si aucune session', async () => {
      const { service } = makeService();
      expect(await service.getSessionList()).toEqual([]);
    });

    it('retourne SessionSummary avec workoutName correct', async () => {
      const { service, sessionLogRepo, workoutRepo } = makeService();
      const workout = await workoutRepo.save({ program_id: 1, name: 'Push A', order_index: 0 });
      await sessionLogRepo.save({ ...baseSessionDto, workout_id: workout.id });
      const list = await service.getSessionList();
      expect(list[0].workoutName).toBe('Push A');
    });

    it('calcule durationSeconds depuis ended_at', async () => {
      const { service, sessionLogRepo, workoutRepo } = makeService();
      const workout = await workoutRepo.save({ program_id: 1, name: 'Push A', order_index: 0 });
      const session = await sessionLogRepo.save({ ...baseSessionDto, workout_id: workout.id });
      await sessionLogRepo.complete(session.id, '2026-01-01T10:47:00.000Z');
      const list = await service.getSessionList();
      expect(list[0].durationSeconds).toBe(47 * 60);
    });

    it('retourne durationSeconds = 0 si ended_at null', async () => {
      const { service, sessionLogRepo, workoutRepo } = makeService();
      const workout = await workoutRepo.save({ program_id: 1, name: 'Push A', order_index: 0 });
      await sessionLogRepo.save({ ...baseSessionDto, workout_id: workout.id });
      const list = await service.getSessionList();
      expect(list[0].durationSeconds).toBe(0);
    });

    it('retourne totalSets correct', async () => {
      const { service, sessionLogRepo, setLogRepo, workoutRepo } = makeService();
      const workout = await workoutRepo.save({ program_id: 1, name: 'Push A', order_index: 0 });
      const session = await sessionLogRepo.save({ ...baseSessionDto, workout_id: workout.id });
      await setLogRepo.save({ session_log_id: session.id, set_id: 1, exercise_id: 5, reps_done: 8, weight_done: 80, rpe: 7, completed_at: '2026-01-01T10:05:00.000Z' });
      await setLogRepo.save({ session_log_id: session.id, set_id: 2, exercise_id: 5, reps_done: 7, weight_done: 80, rpe: 8, completed_at: '2026-01-01T10:10:00.000Z' });
      const list = await service.getSessionList();
      expect(list[0].totalSets).toBe(2);
    });
  });

  describe('getSessionDetail', () => {
    it('retourne null si session inexistante', async () => {
      const { service } = makeService();
      expect(await service.getSessionDetail(999)).toBeNull();
    });

    it('retourne SessionDetail avec check-in et exercices groupés', async () => {
      const { service, sessionLogRepo, setLogRepo, workoutRepo, exerciseRepo } = makeService();
      const workout = await workoutRepo.save({ program_id: 1, name: 'Push A', order_index: 0 });
      const exercise = await exerciseRepo.save(baseExerciseDto);
      const session = await sessionLogRepo.save({ ...baseSessionDto, workout_id: workout.id });
      await sessionLogRepo.complete(session.id, '2026-01-01T10:47:00.000Z');
      await setLogRepo.save({ session_log_id: session.id, set_id: 1, exercise_id: exercise.id, reps_done: 8, weight_done: 80, rpe: 7, completed_at: '2026-01-01T10:05:00.000Z' });
      await setLogRepo.save({ session_log_id: session.id, set_id: 2, exercise_id: exercise.id, reps_done: 7, weight_done: 80, rpe: 8, completed_at: '2026-01-01T10:10:00.000Z' });
      const detail = await service.getSessionDetail(session.id);
      expect(detail).not.toBeNull();
      expect(detail!.workoutName).toBe('Push A');
      expect(detail!.checkinEnergy).toBe(3);
      expect(detail!.exercises).toHaveLength(1);
      expect(detail!.exercises[0].exerciseName).toBe('Développé couché');
      expect(detail!.exercises[0].sets).toHaveLength(2);
      expect(detail!.totalSets).toBe(2);
    });

    it('expose moodAfter de la session', async () => {
      const { service, sessionLogRepo, workoutRepo } = makeService();
      const workout = await workoutRepo.save({ program_id: 1, name: 'Push A', order_index: 0 });
      const session = await sessionLogRepo.save({ ...baseSessionDto, workout_id: workout.id });
      await sessionLogRepo.saveMoodAfter(session.id, 3);
      const detail = await service.getSessionDetail(session.id);
      expect(detail!.moodAfter).toBe(3);
    });

    it('expose moodAfter null si non renseigné', async () => {
      const { service, sessionLogRepo, workoutRepo } = makeService();
      const workout = await workoutRepo.save({ program_id: 1, name: 'Push A', order_index: 0 });
      await sessionLogRepo.save({ ...baseSessionDto, workout_id: workout.id });
      const sessions = await sessionLogRepo.findAll();
      const detail = await service.getSessionDetail(sessions[0].id);
      expect(detail!.moodAfter).toBeNull();
    });

    it('ordonne les sets par completed_at ASC dans chaque exercice', async () => {
      const { service, sessionLogRepo, setLogRepo, workoutRepo, exerciseRepo } = makeService();
      const workout = await workoutRepo.save({ program_id: 1, name: 'Push A', order_index: 0 });
      const exercise = await exerciseRepo.save({ ...baseExerciseDto, name: 'Squat' });
      const session = await sessionLogRepo.save({ ...baseSessionDto, workout_id: workout.id });
      await setLogRepo.save({ session_log_id: session.id, set_id: 2, exercise_id: exercise.id, reps_done: 6, weight_done: 100, rpe: 9, completed_at: '2026-01-01T10:10:00.000Z' });
      await setLogRepo.save({ session_log_id: session.id, set_id: 1, exercise_id: exercise.id, reps_done: 8, weight_done: 100, rpe: 7, completed_at: '2026-01-01T10:05:00.000Z' });
      const detail = await service.getSessionDetail(session.id);
      expect(detail!.exercises[0].sets[0].rpe).toBe(7);
      expect(detail!.exercises[0].sets[1].rpe).toBe(9);
    });
  });

  describe('deleteSession', () => {
    it('supprime la session — elle disparaît de getSessionList', async () => {
      const { service, sessionLogRepo, workoutRepo } = makeService();
      const workout = await workoutRepo.save({ program_id: 1, name: 'Push A', order_index: 0 });
      const session = await sessionLogRepo.save({ ...baseSessionDto, workout_id: workout.id });
      await service.deleteSession(session.id);
      expect(await service.getSessionList()).toHaveLength(0);
    });

    it('supprime les set_logs de la session', async () => {
      const { service, sessionLogRepo, setLogRepo, workoutRepo } = makeService();
      const workout = await workoutRepo.save({ program_id: 1, name: 'Push A', order_index: 0 });
      const session = await sessionLogRepo.save({ ...baseSessionDto, workout_id: workout.id });
      await setLogRepo.save({ session_log_id: session.id, set_id: 1, exercise_id: 5, reps_done: 8, weight_done: 80, rpe: 7, completed_at: '2026-01-01T10:05:00.000Z' });
      await service.deleteSession(session.id);
      expect(await setLogRepo.findBySessionLogId(session.id)).toHaveLength(0);
    });

    it('supprime les PRs liés à la session', async () => {
      const { service, sessionLogRepo, workoutRepo, personalRecordRepo } = makeService();
      const workout = await workoutRepo.save({ program_id: 1, name: 'Push A', order_index: 0 });
      const session = await sessionLogRepo.save({ ...baseSessionDto, workout_id: workout.id });
      await personalRecordRepo.save({ exercise_id: 1, weight: 100, reps: 5, estimated_1rm: 116.7, achieved_at: '2026-01-01T10:00:00.000Z', session_log_id: session.id });
      await service.deleteSession(session.id);
      expect(await personalRecordRepo.findRecent(10)).toHaveLength(0);
    });

    it('ne supprime pas les PRs sans session_log_id (anciens PRs)', async () => {
      const { service, sessionLogRepo, workoutRepo, personalRecordRepo } = makeService();
      const workout = await workoutRepo.save({ program_id: 1, name: 'Push A', order_index: 0 });
      const session = await sessionLogRepo.save({ ...baseSessionDto, workout_id: workout.id });
      await personalRecordRepo.save({ exercise_id: 1, weight: 100, reps: 5, estimated_1rm: 116.7, achieved_at: '2026-01-01T10:00:00.000Z', session_log_id: null });
      await service.deleteSession(session.id);
      expect(await personalRecordRepo.findRecent(10)).toHaveLength(1);
    });

    it("getSessionDetail retourne null après suppression", async () => {
      const { service, sessionLogRepo, workoutRepo } = makeService();
      const workout = await workoutRepo.save({ program_id: 1, name: 'Push A', order_index: 0 });
      const session = await sessionLogRepo.save({ ...baseSessionDto, workout_id: workout.id });
      await service.deleteSession(session.id);
      expect(await service.getSessionDetail(session.id)).toBeNull();
    });
  });
});
