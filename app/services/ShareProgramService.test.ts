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

describe('importPayload', () => {
  it('crée programme + workouts + exercises + sets depuis le payload', async () => {
    const svc = makeService();
    const payload: SharePayload = {
      v: 1,
      program: { name: 'PPL', description: 'Push Pull Legs' },
      workouts: [{
        name: 'Push', order_index: 0,
        exercises: [{
          name: 'Développé couché', type: 'musculation', muscle_groups: '["pectoraux"]',
          blocks: [{
            name: 'Travail', is_work_block: 1, order_index: 0,
            sets: [{ reps_min: 5, weight: 60, weight_type: 'fixed', rest_duration: 180, order_index: 0, duration_seconds: null, set_type: 'normal' }],
          }],
        }],
      }],
    };
    const base64 = svc.compressPayload(JSON.stringify(payload));
    const newId = await svc.importPayload(base64);
    expect(newId).toBeGreaterThan(0);

    const programs = await (svc as any).programRepo.findAll();
    expect(programs).toHaveLength(1);
    expect(programs[0].name).toBe('PPL');
  });

  it('suffixe "(importé)" si nom de programme déjà existant', async () => {
    const svc = makeService();
    await (svc as any).programRepo.save({ name: 'PPL', description: null, is_active: 1 });

    const payload: SharePayload = {
      v: 1,
      program: { name: 'PPL', description: null },
      workouts: [],
    };
    const base64 = svc.compressPayload(JSON.stringify(payload));
    await svc.importPayload(base64);

    const programs = await (svc as any).programRepo.findAll();
    const names = programs.map((p: { name: string }) => p.name);
    expect(names).toContain('PPL (importé)');
  });

  it('round-trip : generatePayload → importPayload → structure identique', async () => {
    const svc = makeService();
    const program = await (svc as any).programRepo.save({ name: 'PPL', description: null, is_active: 1 });
    const workout = await (svc as any).workoutRepo.save({ program_id: program.id, name: 'Push', order_index: 0 });
    const exercise = await (svc as any).exerciseRepo.save({
      name: 'Développé couché', type: 'musculation', muscle_groups: '[]',
      technical_notes: null, description: null, is_custom: 0, progression_step: 2.5, progression_threshold: 1,
    });
    const we = await (svc as any).workoutExerciseRepo.save({ workout_id: workout.id, exercise_id: exercise.id, order_index: 0 });
    const block = await (svc as any).blockRepo.save({ workout_exercise_id: we.id, name: 'Travail', order_index: 0, is_work_block: 1 });
    await (svc as any).setRepo.save({ block_id: block.id, reps_min: 5, weight: 60, weight_type: 'fixed', rest_duration: 180, order_index: 0, set_type: 'normal' });

    const { base64 } = await svc.generatePayload(program.id);
    const newId = await svc.importPayload(base64);

    const imported = await (svc as any).programRepo.findById(newId);
    expect(imported.name).toBe('PPL (importé)');
    const importedWorkouts = await (svc as any).workoutRepo.findByProgramId(newId);
    expect(importedWorkouts).toHaveLength(1);
    expect(importedWorkouts[0].name).toBe('Push');
  });

  it('noms uniques si importé plusieurs fois', async () => {
    const svc = makeService();
    const payload: SharePayload = {
      v: 1,
      program: { name: 'PPL', description: null },
      workouts: [],
    };
    const base64 = svc.compressPayload(JSON.stringify(payload));
    await svc.importPayload(base64);  // crée "PPL"
    await svc.importPayload(base64);  // crée "PPL (importé)"
    await svc.importPayload(base64);  // doit créer "PPL (importé-2)"

    const programs = await (svc as any).programRepo.findAll();
    const names = programs.map((p: { name: string }) => p.name);
    expect(names).toContain('PPL');
    expect(names).toContain('PPL (importé)');
    expect(names).toContain('PPL (importé-2)');
    expect(programs).toHaveLength(3);
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
