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
    const { setLog } = await service.logSet(session.id, 10, 5, { repsDone: 7, weightDone: 80, rpe: 8 });
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
    const { setLog } = await service.logSet(session.id, 10, 5, { repsDone: 8, weightDone: 60, rpe: null });
    expect(setLog.rpe).toBeNull();
  });

  it('stocke durationSeconds et distanceMeters pour les sets cardio', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const session = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    const { setLog } = await service.logSet(session.id, 10, 5, {
      repsDone: 1,
      weightDone: 0,
      rpe: null,
      durationSeconds: 1800,
      distanceMeters: 5000,
    });
    expect(setLog.duration_seconds).toBe(1800);
    expect(setLog.distance_meters).toBe(5000);
  });

  it('retourne isPR: true si premier log avec poids > 0', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const session = await service.startSession(1, { checkin_energy: null, checkin_fatigue: null, checkin_sleep: null });
    const result = await service.logSet(session.id, 10, 5, { repsDone: 5, weightDone: 80, rpe: null });
    expect(result.isPR).toBe(true);
  });

  it('retourne isPR: true si 1RM dépasse le meilleur existant', async () => {
    const ctx = makeService();
    const service = ctx.build();
    await ctx.prRepo.save({ exercise_id: 5, weight: 80, reps: 5, estimated_1rm: 93.3, achieved_at: '2026-01-01T00:00:00.000Z', session_log_id: null });
    const session = await service.startSession(1, { checkin_energy: null, checkin_fatigue: null, checkin_sleep: null });
    // 100 * (1 + 5/30) ≈ 116.67 > 93.3
    const result = await service.logSet(session.id, 10, 5, { repsDone: 5, weightDone: 100, rpe: null });
    expect(result.isPR).toBe(true);
  });

  it('retourne isPR: false si 1RM inférieur au meilleur existant', async () => {
    const ctx = makeService();
    const service = ctx.build();
    await ctx.prRepo.save({ exercise_id: 5, weight: 120, reps: 1, estimated_1rm: 124, achieved_at: '2026-01-01T00:00:00.000Z', session_log_id: null });
    const session = await service.startSession(1, { checkin_energy: null, checkin_fatigue: null, checkin_sleep: null });
    const result = await service.logSet(session.id, 10, 5, { repsDone: 5, weightDone: 80, rpe: null });
    expect(result.isPR).toBe(false);
  });

  it('retourne isPR: false si weightDone = 0', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const session = await service.startSession(1, { checkin_energy: null, checkin_fatigue: null, checkin_sleep: null });
    const result = await service.logSet(session.id, 10, 5, { repsDone: 10, weightDone: 0, rpe: null });
    expect(result.isPR).toBe(false);
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

describe('SessionService.getNextWorkout', () => {
  async function seedWorkouts(ctx: ReturnType<typeof makeService>) {
    const w1 = await ctx.workoutRepo.save({ program_id: 1, name: 'Push', order_index: 0 });
    const w2 = await ctx.workoutRepo.save({ program_id: 1, name: 'Pull', order_index: 1 });
    const w3 = await ctx.workoutRepo.save({ program_id: 1, name: 'Legs', order_index: 2 });
    return [w1, w2, w3];
  }

  it('retourne le premier workout si aucune session passée', async () => {
    const ctx = makeService();
    const service = ctx.build();
    await seedWorkouts(ctx);
    const next = await service.getNextWorkout(1);
    expect(next?.name).toBe('Push');
  });

  it('retourne le workout suivant dans la séquence', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const [w1] = await seedWorkouts(ctx);
    const log = await ctx.sessionLogRepo.save({ workout_id: w1.id, started_at: '2026-01-01T10:00:00.000Z', checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null });
    await ctx.sessionLogRepo.complete(log.id, '2026-01-01T11:00:00.000Z');
    const next = await service.getNextWorkout(1);
    expect(next?.name).toBe('Pull');
  });

  it('boucle sur le premier workout après le dernier', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const [, , w3] = await seedWorkouts(ctx);
    const log = await ctx.sessionLogRepo.save({ workout_id: w3.id, started_at: '2026-01-01T10:00:00.000Z', checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null });
    await ctx.sessionLogRepo.complete(log.id, '2026-01-01T11:00:00.000Z');
    const next = await service.getNextWorkout(1);
    expect(next?.name).toBe('Push');
  });

  it('retourne null si le programme n\'a pas de workouts', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const next = await service.getNextWorkout(1);
    expect(next).toBeNull();
  });

  it('ignore les sessions d\'un autre programme', async () => {
    const ctx = makeService();
    const service = ctx.build();
    await seedWorkouts(ctx);
    const otherWorkout = await ctx.workoutRepo.save({ program_id: 2, name: 'Autre', order_index: 0 });
    await ctx.sessionLogRepo.save({ workout_id: otherWorkout.id, started_at: '2026-01-05T10:00:00.000Z', checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null });
    const next = await service.getNextWorkout(1);
    expect(next?.name).toBe('Push');
  });
});

describe('SessionService.setStartingWeight', () => {
  it("ne modifie rien si l'exercice n'a pas de bloc Travail", async () => {
    const ctx = makeService();
    const service = ctx.build();
    const exercise = await ctx.exerciseRepo.save({ name: 'Footing', type: 'cardio', muscle_groups: '[]', technical_notes: null, description: null, is_custom: 0, progression_step: 0, progression_threshold: 1 });
    const workout = await ctx.workoutRepo.save({ program_id: 1, name: 'Cardio', order_index: 0 });
    const we = await ctx.weRepo.save({ workout_id: workout.id, exercise_id: exercise.id, order_index: 0 });
    const cardioBlock = await ctx.blockRepo.save({ workout_exercise_id: we.id, name: 'Cardio', order_index: 0, is_work_block: 0 });
    const set = await ctx.setRepo.save({ block_id: cardioBlock.id, reps_min: 1, reps_max: 1, weight: null, weight_type: 'fixed', rest_duration: 0, order_index: 0 });

    await service.setStartingWeight(we.id, 50);

    const unchanged = await ctx.setRepo.findById(set.id);
    expect(unchanged?.weight).toBeNull();
  });
});

describe('SessionService.calculateProgressions', () => {
  async function seedWorkoutWithExercise(ctx: ReturnType<typeof makeService>, progressionThreshold = 1) {
    const exercise = await ctx.exerciseRepo.save({
      name: 'Squat',
      type: 'musculation',
      muscle_groups: '[]',
      technical_notes: null,
      description: null,
      is_custom: 0,
      progression_step: 2.5,
      progression_threshold: progressionThreshold,
    });
    const workout = await ctx.workoutRepo.save({ program_id: 1, name: 'Legs', order_index: 0 });
    const we = await ctx.weRepo.save({ workout_id: workout.id, exercise_id: exercise.id, order_index: 0 });
    const block = await ctx.blockRepo.save({ workout_exercise_id: we.id, name: 'Travail', order_index: 0, is_work_block: 1 });
    const set = await ctx.setRepo.save({ block_id: block.id, reps_min: 6, reps_max: 8, weight: 80, weight_type: 'fixed', rest_duration: 120, order_index: 0 });
    return { exercise, workout, we, block, set };
  }

  it('applique la progression si tous les sets de travail sont atteints', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const { exercise, workout, set } = await seedWorkoutWithExercise(ctx, 1);
    const session = await service.startSession(workout.id, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 3 });
    await service.logSet(session.id, set.id, exercise.id, { repsDone: 8, weightDone: 80, rpe: 7 });
    await service.completeSession(session.id);

    const progressions = await service.calculateProgressions(session.id);
    expect(progressions).toHaveLength(1);
    expect(progressions[0].achieved).toBe(true);
    expect(progressions[0].oldWeight).toBe(80);
    expect(progressions[0].newWeight).toBe(82);

    const updatedSet = await ctx.setRepo.findById(set.id);
    expect(updatedSet?.weight).toBe(82);
  });

  it("ne progresse pas si manque d'1 rep (hold)", async () => {
    const ctx = makeService();
    const service = ctx.build();
    const { exercise, workout, set } = await seedWorkoutWithExercise(ctx, 1);
    const session = await service.startSession(workout.id, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 3 });
    // reps_min = 6, reps_done = 5 → manque d'1 rep → hold
    await service.logSet(session.id, set.id, exercise.id, { repsDone: 5, weightDone: 80, rpe: 9 });
    await service.completeSession(session.id);

    const progressions = await service.calculateProgressions(session.id);
    expect(progressions[0].achieved).toBe(false);
    const updatedSet = await ctx.setRepo.findById(set.id);
    expect(updatedSet?.weight).toBe(80);
  });

  it('ne décharge pas si échec significatif isolé (première fois)', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const { exercise, workout, set } = await seedWorkoutWithExercise(ctx, 1);
    const session = await service.startSession(workout.id, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 3 });
    // reps_min = 6, reps_done = 4 → échec significatif (≤ reps_min - 2)
    await service.logSet(session.id, set.id, exercise.id, { repsDone: 4, weightDone: 80, rpe: 9 });
    await service.completeSession(session.id);

    const progressions = await service.calculateProgressions(session.id);
    // Pas de session précédente en échec → pas de décharge
    expect(progressions[0].achieved).toBe(false);
    const updatedSet = await ctx.setRepo.findById(set.id);
    expect(updatedSet?.weight).toBe(80);
  });

  it('applique le décharge si deux échecs significatifs consécutifs', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const { exercise, workout, set } = await seedWorkoutWithExercise(ctx, 1);

    // Session 1 : échec significatif (reps_done = 4, reps_min = 6 → ≤ reps_min - 2)
    const session1 = await service.startSession(workout.id, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 3 });
    await service.logSet(session1.id, set.id, exercise.id, { repsDone: 4, weightDone: 80, rpe: 9 });
    await service.completeSession(session1.id);

    // Session 2 : échec significatif à nouveau → décharge attendue
    const session2 = await service.startSession(workout.id, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 3 });
    await service.logSet(session2.id, set.id, exercise.id, { repsDone: 4, weightDone: 80, rpe: 9 });
    await service.completeSession(session2.id);

    const progressions = await service.calculateProgressions(session2.id);
    // applyDeload(80) = Math.floor(80 * 0.9 / 2) * 2 = 72
    expect(progressions[0].achieved).toBe(false);
    expect(progressions[0].newWeight).toBe(72);
    const updatedSet = await ctx.setRepo.findById(set.id);
    expect(updatedSet?.weight).toBe(72);
  });

  it('ignore les exercices sans bloc Travail (cardio/durée)', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const exercise = await ctx.exerciseRepo.save({ name: 'Footing', type: 'cardio', muscle_groups: '[]', technical_notes: null, description: null, is_custom: 0, progression_step: 0, progression_threshold: 1 });
    const workout = await ctx.workoutRepo.save({ program_id: 1, name: 'Cardio', order_index: 0 });
    const we = await ctx.weRepo.save({ workout_id: workout.id, exercise_id: exercise.id, order_index: 0 });
    const cardioBlock = await ctx.blockRepo.save({ workout_exercise_id: we.id, name: 'Cardio', order_index: 0, is_work_block: 0 });
    const set = await ctx.setRepo.save({ block_id: cardioBlock.id, reps_min: 1, reps_max: 1, weight: null, weight_type: 'fixed', rest_duration: 0, order_index: 0 });

    const session = await service.startSession(workout.id, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 3 });
    await service.logSet(session.id, set.id, exercise.id, { repsDone: 1, weightDone: 0, rpe: null, durationSeconds: 1800, distanceMeters: 5000 });
    await service.completeSession(session.id);

    const progressions = await service.calculateProgressions(session.id);
    expect(progressions).toHaveLength(0);
  });

  it('ignore les blocs non-travail pour le calcul', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const exercise = await ctx.exerciseRepo.save({ name: 'Bench', type: 'musculation', muscle_groups: '[]', technical_notes: null, description: null, is_custom: 0, progression_step: 2, progression_threshold: 1 });
    const workout = await ctx.workoutRepo.save({ program_id: 1, name: 'Push', order_index: 0 });
    const we = await ctx.weRepo.save({ workout_id: workout.id, exercise_id: exercise.id, order_index: 0 });
    // Bloc d'échauffement (is_work_block=0)
    const warmupBlock = await ctx.blockRepo.save({ workout_exercise_id: we.id, name: 'Échauffement', order_index: 0, is_work_block: 0 });
    const warmupSet = await ctx.setRepo.save({ block_id: warmupBlock.id, reps_min: 10, reps_max: 10, weight: 40, weight_type: 'fixed', rest_duration: 60, order_index: 0 });
    // Bloc de travail (is_work_block=1)
    const workBlock = await ctx.blockRepo.save({ workout_exercise_id: we.id, name: 'Travail', order_index: 1, is_work_block: 1 });
    const workSet = await ctx.setRepo.save({ block_id: workBlock.id, reps_min: 6, reps_max: 8, weight: 80, weight_type: 'fixed', rest_duration: 120, order_index: 0 });

    const session = await service.startSession(workout.id, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 3 });
    // Log seulement l'échauffement (pas le bloc travail)
    await service.logSet(session.id, warmupSet.id, exercise.id, { repsDone: 10, weightDone: 40, rpe: null });
    await service.completeSession(session.id);

    const progressions = await service.calculateProgressions(session.id);
    // Aucun log pour le bloc de travail → pas de progression
    expect(progressions[0].achieved).toBe(false);
    const updatedWorkSet = await ctx.setRepo.findById(workSet.id);
    expect(updatedWorkSet?.weight).toBe(80);
  });
});

describe('SessionService.pauseSession', () => {
  it('met status=paused et sérialise la position', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const log = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    await service.pauseSession(log.id, { exerciseIdx: 0, blockIdx: 1, setIdx: 2 }, 'running');
    const updated = await ctx.sessionLogRepo.findById(log.id);
    expect(updated!.status).toBe('paused');
    const pos = JSON.parse(updated!.paused_position!);
    expect(pos).toEqual({ exerciseIdx: 0, blockIdx: 1, setIdx: 2, phase: 'running' });
  });
});

describe('SessionService.abandonSession', () => {
  it('met status=abandoned et ended_at, ne calcule pas les progressions', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const log = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    await service.abandonSession(log.id);
    const updated = await ctx.sessionLogRepo.findById(log.id);
    expect(updated!.status).toBe('abandoned');
    expect(updated!.ended_at).not.toBeNull();
  });

  it('ne lance pas calculateProgressions (les sets_logs ne déclenchent pas de mise à jour poids)', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const log = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    await expect(service.abandonSession(log.id)).resolves.toBeUndefined();
  });
});

describe('SessionService.findAnyPausedSession', () => {
  it('retourne null si aucune session en pause', async () => {
    const ctx = makeService();
    const service = ctx.build();
    expect(await service.findAnyPausedSession()).toBeNull();
  });

  it('retourne la session en pause avec workoutName, setsLogged, volume', async () => {
    const ctx = makeService();
    const workout = await ctx.workoutRepo.save({ program_id: 1, name: 'PPL Push', order_index: 0 });
    const service = ctx.build();
    const log = await service.startSession(workout.id, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    await ctx.setLogRepo.save({ session_log_id: log.id, set_id: 1, exercise_id: 1, reps_done: 8, weight_done: 80, rpe: null, completed_at: new Date().toISOString() });
    await service.pauseSession(log.id, { exerciseIdx: 0, blockIdx: 0, setIdx: 1 }, 'running');
    const result = await service.findAnyPausedSession();
    expect(result).not.toBeNull();
    expect(result!.workoutName).toBe('PPL Push');
    expect(result!.setsLogged).toBe(1);
    expect(result!.volume).toBe(8 * 80);
  });

  it('ignore les sessions completed et abandoned', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const log = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    await service.abandonSession(log.id);
    expect(await service.findAnyPausedSession()).toBeNull();
  });
});

describe('SessionService.startSession (garde session en pause)', () => {
  it("throw si une session est déjà en pause pour ce workoutId", async () => {
    const ctx = makeService();
    const service = ctx.build();
    const log = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    await service.pauseSession(log.id, { exerciseIdx: 0, blockIdx: 0, setIdx: 0 }, 'running');
    await expect(
      service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 })
    ).rejects.toThrow('Une séance est déjà en pause');
  });

  it('permet de démarrer un autre workoutId même si une session est en pause', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const log = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    await service.pauseSession(log.id, { exerciseIdx: 0, blockIdx: 0, setIdx: 0 }, 'running');
    await expect(
      service.startSession(2, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 })
    ).resolves.toBeDefined();
  });
});
