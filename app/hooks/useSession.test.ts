import { computeNextLabel, advancePosition, isSupersetForward, isSupersetNextRound, useSession } from './useSession';
import type { SessionPosition } from './useSession';
import type { WorkoutExerciseDetail } from '../services/WorkoutExerciseService';
import { renderHook, act } from '@testing-library/react-native';

jest.mock('../db', () => ({
  getDb: () => ({
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    getAllAsync: jest.fn().mockResolvedValue([]),
  }),
}));

function makeExercise(name: string, weight: number | null = 80, sets = 3): WorkoutExerciseDetail {
  return {
    id: 1,
    workout_id: 1,
    order_index: 0,
    superset_group_id: null,
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
        { id: 2, name: 'Back-off', order_index: 1, is_work_block: 0, sets: [{ id: 10, block_id: 2, reps_min: 10, weight: 60, weight_type: 'fixed' as const, rest_duration: 60, order_index: 0, duration_seconds: null, weight_ratio: null }] },
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

describe('useSession avec initialSession', () => {
  it('démarre en phase running (pas checkin) si initialSession fourni', () => {
    const { result } = renderHook(() =>
      useSession(1, [], {
        sessionLogId: 42,
        position: { exerciseIdx: 0, blockIdx: 0, setIdx: 1 },
        phase: 'running',
        startedAt: Date.now(),
        setsLogged: 2,
        volume: 320,
      })
    );
    expect(result.current.phase).toBe('running');
    expect(result.current.sessionLogId).toBe(42);
  });

  it('initialise totalSetsLogged et totalVolume depuis initialSession', () => {
    const { result } = renderHook(() =>
      useSession(1, [], {
        sessionLogId: 42,
        position: { exerciseIdx: 0, blockIdx: 0, setIdx: 1 },
        phase: 'running',
        startedAt: Date.now(),
        setsLogged: 3,
        volume: 480,
      })
    );
    expect(result.current.totalSetsLogged).toBe(3);
    expect(result.current.totalVolume).toBe(480);
  });

  it('expose pauseSession dans le résultat', () => {
    const { result } = renderHook(() => useSession(1, []));
    expect(typeof result.current.pauseSession).toBe('function');
  });
});

describe('useSession — flow warmup', () => {
  function makeExerciseWithWeight(weight: number, weightType: 'fixed' | 'bodyweight' | 'bar' = 'fixed'): WorkoutExerciseDetail {
    return {
      id: 10,
      workout_id: 1,
      order_index: 0,
      superset_group_id: null,
      exercise: {
        id: 10,
        name: 'Squat barre',
        type: 'musculation',
        technical_notes: null,
        muscle_groups: '[]',
        description: null,
      },
      blocks: [
        {
          id: 20,
          name: 'Travail',
          order_index: 0,
          is_work_block: 1,
          sets: [
            {
              id: 100,
              block_id: 20,
              reps_min: 5,
              weight,
              weight_type: weightType,
              rest_duration: 180,
              order_index: 0,
              duration_seconds: null,
              weight_ratio: null,
            },
          ],
        },
      ],
    };
  }

  it('confirmTransition avec exercice qualifié (weight ≥ 40, fixed) → phase devient warmup', () => {
    const exercises = [makeExerciseWithWeight(80)];
    const { result } = renderHook(() =>
      useSession(1, exercises, {
        sessionLogId: 1,
        position: { exerciseIdx: 0, blockIdx: 0, setIdx: 0 },
        phase: 'exercise_transition',
        startedAt: Date.now(),
        setsLogged: 0,
        volume: 0,
      })
    );
    act(() => {
      result.current.confirmTransition();
    });
    expect(result.current.phase).toBe('warmup');
    expect(result.current.warmupWorkWeight).toBe(80);
  });

  it('confirmTransition avec exercice non qualifié (weight < 40) → phase devient running', () => {
    const exercises = [makeExerciseWithWeight(30)];
    const { result } = renderHook(() =>
      useSession(1, exercises, {
        sessionLogId: 1,
        position: { exerciseIdx: 0, blockIdx: 0, setIdx: 0 },
        phase: 'exercise_transition',
        startedAt: Date.now(),
        setsLogged: 0,
        volume: 0,
      })
    );
    act(() => {
      result.current.confirmTransition();
    });
    expect(result.current.phase).toBe('running');
  });

  it('confirmWarmup → phase devient running depuis warmup', () => {
    const exercises = [makeExerciseWithWeight(80)];
    const { result } = renderHook(() =>
      useSession(1, exercises, {
        sessionLogId: 1,
        position: { exerciseIdx: 0, blockIdx: 0, setIdx: 0 },
        phase: 'exercise_transition',
        startedAt: Date.now(),
        setsLogged: 0,
        volume: 0,
      })
    );
    act(() => {
      result.current.confirmTransition();
    });
    expect(result.current.phase).toBe('warmup');
    act(() => {
      result.current.confirmWarmup();
    });
    expect(result.current.phase).toBe('running');
  });
});

// ---------------------------------------------------------------------------
// Superset helpers — TDD new tests
// ---------------------------------------------------------------------------

function makeDetail(exerciseIdx: number, groupId: number | null = null, numSets = 3): WorkoutExerciseDetail {
  const sets = Array.from({ length: numSets }, (_, i) => ({
    id: exerciseIdx * 10 + i + 1,
    block_id: exerciseIdx + 1,
    reps_min: 5,
    weight: 80,
    weight_type: 'fixed' as const,
    rest_duration: 90,
    order_index: i,
    duration_seconds: null,
    weight_ratio: null,
  }));
  return {
    id: exerciseIdx + 1,
    workout_id: 1,
    order_index: exerciseIdx,
    superset_group_id: groupId,
    exercise: {
      id: exerciseIdx + 1,
      name: `Ex${exerciseIdx}`,
      type: 'musculation',
      technical_notes: null,
      muscle_groups: '[]',
      description: null,
    },
    blocks: [{ id: exerciseIdx + 1, name: 'Travail', order_index: 0, is_work_block: 1, sets }],
  };
}

// details: [standalone(0), A(1, group1), B(2, group1), C(3, group1), standalone(4)]
const SUPERSET_GROUP_ID = 1;
function makeDetails() {
  return [
    makeDetail(0),                    // standalone
    makeDetail(1, SUPERSET_GROUP_ID), // A
    makeDetail(2, SUPERSET_GROUP_ID), // B
    makeDetail(3, SUPERSET_GROUP_ID), // C
    makeDetail(4),                    // standalone after group
  ];
}

describe('advancePosition — supersets', () => {
  it('A→B : avance au prochain exercice du groupe, même setIdx', () => {
    const details = makeDetails();
    const next = advancePosition({ exerciseIdx: 1, blockIdx: 0, setIdx: 0 }, details);
    expect(next).toEqual({ exerciseIdx: 2, blockIdx: 0, setIdx: 0 });
  });

  it('B→C : avance encore dans le groupe', () => {
    const details = makeDetails();
    const next = advancePosition({ exerciseIdx: 2, blockIdx: 0, setIdx: 0 }, details);
    expect(next).toEqual({ exerciseIdx: 3, blockIdx: 0, setIdx: 0 });
  });

  it('C (dernier du groupe) → A tour suivant (setIdx+1)', () => {
    const details = makeDetails();
    const next = advancePosition({ exerciseIdx: 3, blockIdx: 0, setIdx: 0 }, details);
    expect(next).toEqual({ exerciseIdx: 1, blockIdx: 0, setIdx: 1 });
  });

  it('C dernier tour → exercice standalone après le groupe', () => {
    const details = makeDetails();
    const next = advancePosition({ exerciseIdx: 3, blockIdx: 0, setIdx: 2 }, details);
    expect(next).toEqual({ exerciseIdx: 4, blockIdx: 0, setIdx: 0 });
  });

  it('C dernier tour sans exercice suivant → null', () => {
    const details = [makeDetail(0, SUPERSET_GROUP_ID), makeDetail(1, SUPERSET_GROUP_ID)];
    const next = advancePosition({ exerciseIdx: 1, blockIdx: 0, setIdx: 2 }, details);
    expect(next).toBeNull();
  });

  it('groupe à un seul membre avec 1 set : null', () => {
    const details = [makeDetail(0, 99, 1)];
    const next = advancePosition({ exerciseIdx: 0, blockIdx: 0, setIdx: 0 }, details);
    expect(next).toBeNull();
  });
});

describe('isSupersetForward', () => {
  it('A→B dans le même groupe → true', () => {
    const details = makeDetails();
    expect(isSupersetForward(
      { exerciseIdx: 1, blockIdx: 0, setIdx: 0 },
      { exerciseIdx: 2, blockIdx: 0, setIdx: 0 },
      details
    )).toBe(true);
  });

  it('C→A (retour début de groupe) → false', () => {
    const details = makeDetails();
    expect(isSupersetForward(
      { exerciseIdx: 3, blockIdx: 0, setIdx: 0 },
      { exerciseIdx: 1, blockIdx: 0, setIdx: 1 },
      details
    )).toBe(false);
  });
});
