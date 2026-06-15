import { ShareProgramService, SharePayload } from './ShareProgramService';
import { InMemoryProgramRepository } from '../repositories/InMemoryProgramRepository';
import { InMemoryWorkoutRepository } from '../repositories/InMemoryWorkoutRepository';
import { InMemoryWorkoutExerciseRepository } from '../repositories/InMemoryWorkoutExerciseRepository';
import { InMemoryBlockRepository } from '../repositories/InMemoryBlockRepository';
import { InMemorySetRepository } from '../repositories/InMemorySetRepository';
import { InMemoryExerciseRepository } from '../repositories/InMemoryExerciseRepository';

function makeService() {
  return new ShareProgramService(
    new InMemoryProgramRepository(),
    new InMemoryWorkoutRepository(),
    new InMemoryWorkoutExerciseRepository(),
    new InMemoryBlockRepository(),
    new InMemorySetRepository(),
    new InMemoryExerciseRepository(),
  );
}

describe('ShareProgramService — helpers purs', () => {
  const svc = makeService();

  it('compressPayload produit une chaîne base64 non vide', () => {
    const json = JSON.stringify({ v: 1, program: { name: 'Test' }, workouts: [] });
    const result = svc.compressPayload(json);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('decompressPayload est l\'inverse de compressPayload', () => {
    const json = JSON.stringify({ v: 1, program: { name: 'Test' }, workouts: [] });
    const compressed = svc.compressPayload(json);
    const restored = svc.decompressPayload(compressed);
    expect(restored).toBe(json);
  });

  it('compressPayload réduit la taille d\'un gros JSON', () => {
    const big = JSON.stringify({ v: 1, data: 'x'.repeat(1000) });
    const compressed = svc.compressPayload(big);
    expect(compressed.length).toBeLessThan(big.length);
  });
});

describe('generatePayload', () => {
  it('sérialise un programme complet et retourne base64 + sizeBytes', async () => {
    const svc = makeService();

    // Seed : programme → workout → exercise → workoutExercise → block → set
    const program = await (svc as any).programRepo.save({ name: 'PPL', description: null, is_active: 1 });
    const workout = await (svc as any).workoutRepo.save({ program_id: program.id, name: 'Push', order_index: 0 });
    const exercise = await (svc as any).exerciseRepo.save({
      name: 'Développé couché', type: 'musculation', muscle_groups: '["pectoraux"]',
      technical_notes: null, description: null, is_custom: 0, progression_step: 2.5, progression_threshold: 1,
    });
    const we = await (svc as any).workoutExerciseRepo.save({ workout_id: workout.id, exercise_id: exercise.id, order_index: 0 });
    const block = await (svc as any).blockRepo.save({ workout_exercise_id: we.id, name: 'Travail', order_index: 0, is_work_block: 1 });
    await (svc as any).setRepo.save({
      block_id: block.id, reps_min: 5, weight: 60, weight_type: 'fixed',
      rest_duration: 180, order_index: 0, set_type: 'normal',
    });

    const result = await svc.generatePayload(program.id);
    expect(typeof result.base64).toBe('string');
    expect(result.sizeBytes).toBeGreaterThan(0);

    const json = svc.decompressPayload(result.base64);
    const payload: SharePayload = JSON.parse(json);
    expect(payload.v).toBe(1);
    expect(payload.program.name).toBe('PPL');
    expect(payload.workouts).toHaveLength(1);
    expect(payload.workouts[0].exercises).toHaveLength(1);
    expect(payload.workouts[0].exercises[0].blocks).toHaveLength(1);
    expect(payload.workouts[0].exercises[0].blocks[0].sets).toHaveLength(1);
  });
});
