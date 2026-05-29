import { SessionService } from './SessionService';
import { InMemorySessionLogRepository } from '../repositories/InMemorySessionLogRepository';
import { InMemorySetLogRepository } from '../repositories/InMemorySetLogRepository';
import { InMemoryPersonalRecordRepository } from '../repositories/InMemoryPersonalRecordRepository';
import { InMemoryWorkoutRepository } from '../repositories/InMemoryWorkoutRepository';
import { InMemoryWorkoutExerciseRepository } from '../repositories/InMemoryWorkoutExerciseRepository';
import { InMemoryBlockRepository } from '../repositories/InMemoryBlockRepository';
import { InMemorySetRepository } from '../repositories/InMemorySetRepository';
import { InMemoryExerciseRepository } from '../repositories/InMemoryExerciseRepository';

function makeService() {
  return {
    sessionLogRepo: new InMemorySessionLogRepository(),
    setLogRepo: new InMemorySetLogRepository(),
    prRepo: new InMemoryPersonalRecordRepository(),
    workoutRepo: new InMemoryWorkoutRepository(),
    weRepo: new InMemoryWorkoutExerciseRepository(),
    blockRepo: new InMemoryBlockRepository(),
    setRepo: new InMemorySetRepository(),
    exerciseRepo: new InMemoryExerciseRepository(),
    build() {
      return new SessionService(
        this.sessionLogRepo, this.setLogRepo, this.prRepo,
        this.workoutRepo, this.weRepo, this.blockRepo,
        this.setRepo, this.exerciseRepo,
      );
    },
  };
}

describe('SessionService.startSession', () => {
  it('crée un session_log avec workout_id et checkin', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const log = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    expect(log.id).toBeGreaterThan(0);
    expect(log.workout_id).toBe(1);
    expect(log.ended_at).toBeNull();
    expect(log.checkin_energy).toBe(3);
    expect(log.checkin_fatigue).toBe(1);
    expect(log.checkin_sleep).toBe(2);
  });
  it('accepte checkin avec valeurs null', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const log = await service.startSession(1, { checkin_energy: null, checkin_fatigue: null, checkin_sleep: null });
    expect(log.checkin_energy).toBeNull();
  });
});

describe('SessionService.logSet', () => {
  it('crée un set_log avec les données réelles', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const session = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    const setLog = await service.logSet(session.id, 10, 5, { repsDone: 7, weightDone: 80, rpe: 8 });
    expect(setLog.id).toBeGreaterThan(0);
    expect(setLog.session_log_id).toBe(session.id);
    expect(setLog.set_id).toBe(10);
    expect(setLog.exercise_id).toBe(5);
    expect(setLog.reps_done).toBe(7);
    expect(setLog.weight_done).toBe(80);
    expect(setLog.rpe).toBe(8);
  });
  it('crée un PR si 1RM meilleur que le précédent', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const session = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    await service.logSet(session.id, 10, 5, { repsDone: 5, weightDone: 100, rpe: null });
    const pr = await ctx.prRepo.findBestByExerciseId(5);
    // 1RM Epley: 100 * (1 + 5/30) ≈ 116.67
    expect(pr).not.toBeNull();
    expect(pr!.estimated_1rm).toBeCloseTo(116.67, 1);
  });
  it("ne crée pas de PR si weight = 0", async () => {
    const ctx = makeService();
    const service = ctx.build();
    const session = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    await service.logSet(session.id, 10, 5, { repsDone: 10, weightDone: 0, rpe: null });
    expect(await ctx.prRepo.findBestByExerciseId(5)).toBeNull();
  });
  it('ne crée pas de PR si 1RM inférieur au meilleur existant', async () => {
    const ctx = makeService();
    const service = ctx.build();
    await ctx.prRepo.save({ exercise_id: 5, weight: 120, reps: 1, estimated_1rm: 124, achieved_at: '2026-01-01T00:00:00.000Z', session_log_id: null });
    const session = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    await service.logSet(session.id, 10, 5, { repsDone: 5, weightDone: 100, rpe: null });
    const allPrs = await ctx.prRepo.findBestByExerciseId(5);
    expect(allPrs?.weight).toBe(120);
  });
  it('accepte rpe null', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const session = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    const setLog = await service.logSet(session.id, 10, 5, { repsDone: 8, weightDone: 60, rpe: null });
    expect(setLog.rpe).toBeNull();
  });
});

describe('SessionService.completeSession', () => {
  it('met ended_at sur le session_log', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const session = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    expect(session.ended_at).toBeNull();
    await service.completeSession(session.id);
    const updated = await ctx.sessionLogRepo.findById(session.id);
    expect(updated?.ended_at).not.toBeNull();
  });
});
