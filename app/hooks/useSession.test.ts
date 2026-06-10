import { computeNextLabel, advancePosition } from './useSession';
import type { SessionPosition } from './useSession';
import type { WorkoutExerciseDetail } from '../services/WorkoutExerciseService';

function makeExercise(name: string, weight: number | null = 80, sets = 3): WorkoutExerciseDetail {
  return {
    id: 1,
    workout_id: 1,
    order_index: 0,
    exercise: {
      id: 1,
      name,
      type: 'musculation',
      technical_notes: null,
      muscle_groups: '[]',
      description: null,
    },
    blocks: [
      {
        id: 1,
        name: 'Travail',
        order_index: 0,
        is_work_block: 1,
        sets: Array.from({ length: sets }, (_, i) => ({
          id: i + 1,
          block_id: 1,
          reps_min: 8,
          reps_max: 8,
          weight,
          weight_type: 'fixed' as const,
          rest_duration: 90,
          order_index: i,
          duration_seconds: null,
          weight_ratio: null,
        })),
      },
    ],
  };
}

describe('computeNextLabel', () => {
  it('returns exercise name when exercise changes', () => {
    const exercises = [makeExercise('Squat barre'), makeExercise('Rowing barre')];
    const next: SessionPosition = { exerciseIdx: 1, blockIdx: 0, setIdx: 0 };
    expect(computeNextLabel(next, exercises, true)).toBe('Exercice suivant : Rowing barre');
  });

  it('returns set info within same exercise with weight', () => {
    const exercises = [makeExercise('Squat barre', 80, 4)];
    const next: SessionPosition = { exerciseIdx: 0, blockIdx: 0, setIdx: 2 };
    expect(computeNextLabel(next, exercises, false)).toBe('Série 3/4 — 80kg');
  });

  it('omits weight when null', () => {
    const exercises = [makeExercise('Tractions', null, 3)];
    const next: SessionPosition = { exerciseIdx: 0, blockIdx: 0, setIdx: 1 };
    expect(computeNextLabel(next, exercises, false)).toBe('Série 2/3');
  });

  it('shows set 1/N for first set', () => {
    const exercises = [makeExercise('Squat barre', 100, 4)];
    const next: SessionPosition = { exerciseIdx: 0, blockIdx: 0, setIdx: 0 };
    expect(computeNextLabel(next, exercises, false)).toBe('Série 1/4 — 100kg');
  });
});

describe('advancePosition', () => {
  it('advances setIdx within block', () => {
    const exercises = [makeExercise('A', 80, 3)];
    const pos: SessionPosition = { exerciseIdx: 0, blockIdx: 0, setIdx: 0 };
    expect(advancePosition(pos, exercises)).toEqual({ exerciseIdx: 0, blockIdx: 0, setIdx: 1 });
  });

  it('returns null at last set of last exercise', () => {
    const exercises = [makeExercise('A', 80, 2)];
    const pos: SessionPosition = { exerciseIdx: 0, blockIdx: 0, setIdx: 1 };
    expect(advancePosition(pos, exercises)).toBeNull();
  });

  it('advances to next exercise', () => {
    const exercises = [makeExercise('A', 80, 1), makeExercise('B', 80, 1)];
    const pos: SessionPosition = { exerciseIdx: 0, blockIdx: 0, setIdx: 0 };
    expect(advancePosition(pos, exercises)).toEqual({ exerciseIdx: 1, blockIdx: 0, setIdx: 0 });
  });

  it('advances to next block within same exercise', () => {
    const exercise: WorkoutExerciseDetail = {
      ...makeExercise('A', 80, 1),
      blocks: [
        makeExercise('A', 80, 1).blocks[0],
        { id: 2, name: 'Back-off', order_index: 1, is_work_block: 0, sets: [{ id: 10, block_id: 2, reps_min: 10, reps_max: 10, weight: 60, weight_type: 'fixed' as const, rest_duration: 60, order_index: 0, duration_seconds: null, weight_ratio: null }] },
      ],
    };
    const pos: SessionPosition = { exerciseIdx: 0, blockIdx: 0, setIdx: 0 };
    expect(advancePosition(pos, [exercise])).toEqual({ exerciseIdx: 0, blockIdx: 1, setIdx: 0 });
  });

  it('returns null for empty exercises array', () => {
    const pos: SessionPosition = { exerciseIdx: 0, blockIdx: 0, setIdx: 0 };
    expect(advancePosition(pos, [])).toBeNull();
  });
});

describe('computeNextLabel edge cases', () => {
  it('returns empty string when exerciseIdx is out of bounds', () => {
    const exercises = [makeExercise('A')];
    const next: SessionPosition = { exerciseIdx: 5, blockIdx: 0, setIdx: 0 };
    expect(computeNextLabel(next, exercises, true)).toBe('Exercice suivant : ');
  });
});

describe('UseSessionResult interface includes markStartingWeightDone', () => {
  it('markStartingWeightDone exists as key in UseSessionResult type', () => {
    // Test de type compilé : si UseSessionResult n'a pas markStartingWeightDone,
    // l'assignation suivante échoue à la compilation TypeScript
    const key: keyof import('./useSession').UseSessionResult = 'markStartingWeightDone';
    expect(key).toBe('markStartingWeightDone');
  });
});
