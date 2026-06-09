import { resolveWeights } from './weightRatio';
import type { WorkoutExerciseDetail } from './WorkoutExerciseService';
import type { Set as TrainingSet } from '../db/types';

function makeSet(overrides: Partial<TrainingSet>): TrainingSet {
  return {
    id: 1,
    block_id: 1,
    reps_min: 8,
    reps_max: 8,
    weight: null,
    weight_ratio: null,
    weight_type: 'fixed',
    rest_duration: 120,
    order_index: 0,
    duration_seconds: null,
    ...overrides,
  };
}

function makeExercise(blocks: WorkoutExerciseDetail['blocks']): WorkoutExerciseDetail {
  return {
    id: 1,
    workout_id: 1,
    order_index: 0,
    exercise: { id: 1, name: 'Test', type: 'musculation', technical_notes: null, muscle_groups: '[]', description: null },
    blocks,
  };
}

describe('resolveWeights', () => {
  it('calcule le poids Back-off depuis le poids Travail', () => {
    const exercise = makeExercise([
      { id: 1, name: 'Travail', order_index: 0, is_work_block: 1, sets: [makeSet({ weight: 60 })] },
      { id: 2, name: 'Back-off', order_index: 1, is_work_block: 1, sets: [makeSet({ weight_ratio: 0.8 })] },
    ]);
    const result = resolveWeights(exercise);
    expect(result.blocks[1].sets[0].weight).toBe(48);
  });

  it("retourne l'exercice inchangé si le poids Travail est null", () => {
    const exercise = makeExercise([
      { id: 1, name: 'Travail', order_index: 0, is_work_block: 1, sets: [makeSet({ weight: null })] },
      { id: 2, name: 'Back-off', order_index: 1, is_work_block: 1, sets: [makeSet({ weight_ratio: 0.8 })] },
    ]);
    const result = resolveWeights(exercise);
    expect(result.blocks[1].sets[0].weight).toBeNull();
  });

  it('ne remplace pas un poids déjà défini sur le set', () => {
    const exercise = makeExercise([
      { id: 1, name: 'Travail', order_index: 0, is_work_block: 1, sets: [makeSet({ weight: 60 })] },
      { id: 2, name: 'Back-off', order_index: 1, is_work_block: 1, sets: [makeSet({ weight: 40, weight_ratio: 0.8 })] },
    ]);
    const result = resolveWeights(exercise);
    expect(result.blocks[1].sets[0].weight).toBe(40);
  });

  it('arrondit au multiple de 2kg inférieur', () => {
    // 63 × 0.8 = 50.4 → Math.round(50.4 / 2) * 2 = Math.round(25.2) * 2 = 25 * 2 = 50
    const exercise = makeExercise([
      { id: 1, name: 'Travail', order_index: 0, is_work_block: 1, sets: [makeSet({ weight: 63 })] },
      { id: 2, name: 'Back-off', order_index: 1, is_work_block: 1, sets: [makeSet({ weight_ratio: 0.8 })] },
    ]);
    const result = resolveWeights(exercise);
    expect(result.blocks[1].sets[0].weight).toBe(50);
  });

  it('ne modifie pas les sets sans weight_ratio (Travail, Échauffement)', () => {
    const exercise = makeExercise([
      { id: 1, name: 'Travail', order_index: 0, is_work_block: 1, sets: [makeSet({ weight: 60 })] },
    ]);
    const result = resolveWeights(exercise);
    expect(result.blocks[0].sets[0].weight).toBe(60);
    expect(result.blocks[0].sets[0].weight_ratio).toBeNull();
  });

  it("retourne l'exercice inchangé s'il n'y a pas de bloc Travail", () => {
    const exercise = makeExercise([
      { id: 1, name: 'Échauffement', order_index: 0, is_work_block: 0, sets: [makeSet({ weight: 30 })] },
    ]);
    const result = resolveWeights(exercise);
    expect(result).toEqual(exercise);
  });
});
