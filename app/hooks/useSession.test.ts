import { computeNextLabel, advancePosition, isSupersetForward, useSession } from './useSession';
import type { SessionPosition } from './useSession';
import type { WorkoutExerciseDetail } from '../services/WorkoutExerciseService';
import { renderHook, act } from '@testing-library/react-native';

const mockDbInstance = {
  runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  getAllAsync: jest.fn().mockResolvedValue([]),
};

jest.mock('../db', () => ({
  getDb: () => mockDbInstance,
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
          set_type: 'normal' as const,
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
        { id: 2, name: 'Back-off', order_index: 1, is_work_block: 0, sets: [{ id: 10, block_id: 2, reps_min: 10, weight: 60, weight_type: 'fixed' as const, rest_duration: 60, order_index: 0, duration_seconds: null, weight_ratio: null, set_type: 'normal' as const }] },
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
              set_type: 'normal' as const,
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
    set_type: 'normal' as const,
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

// ---------------------------------------------------------------------------
// Dropset routing — régression
// ---------------------------------------------------------------------------

describe('useSession — dropset routing', () => {
  // Override getFirstAsync pour retourner un SetLog valide, permettant validateSet de s'exécuter
  beforeEach(() => {
    mockDbInstance.getFirstAsync.mockResolvedValue({
      id: 1, session_log_id: 1, set_id: 1, exercise_id: 1,
      reps_done: 8, weight_done: 60, rpe: null,
      completed_at: new Date().toISOString(),
      duration_seconds: null, distance_meters: null,
    });
  });

  afterEach(() => {
    mockDbInstance.getFirstAsync.mockResolvedValue(null);
  });

  function makeDropsetExercise(): WorkoutExerciseDetail {
    return {
      id: 1,
      workout_id: 1,
      order_index: 0,
      superset_group_id: null,
      exercise: { id: 1, name: 'Curl biceps', type: 'musculation', technical_notes: null, muscle_groups: '[]', description: null },
      blocks: [{
        id: 1,
        name: 'Travail',
        order_index: 0,
        is_work_block: 1,
        sets: [
          { id: 1, block_id: 1, reps_min: 8, weight: 60, weight_type: 'fixed' as const, rest_duration: 0, order_index: 0, duration_seconds: null, weight_ratio: null, set_type: 'normal' as const },
          { id: 2, block_id: 1, reps_min: 8, weight: 50, weight_type: 'fixed' as const, rest_duration: 0, order_index: 1, duration_seconds: null, weight_ratio: null, set_type: 'normal' as const },
          { id: 3, block_id: 1, reps_min: 8, weight: 40, weight_type: 'fixed' as const, rest_duration: 90, order_index: 2, duration_seconds: null, weight_ratio: null, set_type: 'normal' as const },
        ],
      }],
    };
  }

  it('rest_duration=0 dans même bloc → phase running directement (pas de rest)', async () => {
    const { result } = renderHook(() =>
      useSession(1, [makeDropsetExercise()], {
        sessionLogId: 1,
        position: { exerciseIdx: 0, blockIdx: 0, setIdx: 0 },
        phase: 'running',
        startedAt: Date.now(),
        setsLogged: 0,
        volume: 0,
      })
    );
    await act(async () => {
      await result.current.validateSet({ repsDone: 8, weightDone: 60, rpe: null });
    });
    expect(result.current.phase).toBe('running');
    expect(result.current.position.setIdx).toBe(1);
  });

  it('rest_duration>0 — séries après le dropset → phase rest normale', async () => {
    // On valide la série du milieu (rest_duration=0) :
    // setIdx:0 (rest=0) → setIdx:1 → running
    // On valide setIdx:1 (rest_duration=0) → setIdx:2 → running (dropset chain)
    // On veut vérifier que setIdx:1 (rest_duration=0) reste bien en running et non en rest
    // => test complémentaire : valider setIdx:0 → reste en running (déjà couvert)
    // Pour tester rest_duration>0 : on part de setIdx:1 dont le COMPLETED set a rest_duration=0
    // mais le troisième set (setIdx:2, rest_duration=90) est le dernier → summary
    // On ajoute une 4ème série après pour que next != null après setIdx:2
    const exerciseWith4Sets: WorkoutExerciseDetail = {
      id: 1,
      workout_id: 1,
      order_index: 0,
      superset_group_id: null,
      exercise: { id: 1, name: 'Curl biceps', type: 'musculation', technical_notes: null, muscle_groups: '[]', description: null },
      blocks: [{
        id: 1,
        name: 'Travail',
        order_index: 0,
        is_work_block: 1,
        sets: [
          { id: 1, block_id: 1, reps_min: 8, weight: 60, weight_type: 'fixed' as const, rest_duration: 0, order_index: 0, duration_seconds: null, weight_ratio: null, set_type: 'normal' as const },
          { id: 2, block_id: 1, reps_min: 8, weight: 50, weight_type: 'fixed' as const, rest_duration: 0, order_index: 1, duration_seconds: null, weight_ratio: null, set_type: 'normal' as const },
          { id: 3, block_id: 1, reps_min: 8, weight: 40, weight_type: 'fixed' as const, rest_duration: 90, order_index: 2, duration_seconds: null, weight_ratio: null, set_type: 'normal' as const },
          { id: 4, block_id: 1, reps_min: 8, weight: 40, weight_type: 'fixed' as const, rest_duration: 90, order_index: 3, duration_seconds: null, weight_ratio: null, set_type: 'normal' as const },
        ],
      }],
    };
    const { result } = renderHook(() =>
      useSession(1, [exerciseWith4Sets], {
        sessionLogId: 1,
        position: { exerciseIdx: 0, blockIdx: 0, setIdx: 2 },
        phase: 'running',
        startedAt: Date.now(),
        setsLogged: 2,
        volume: 880,
      })
    );
    await act(async () => {
      await result.current.validateSet({ repsDone: 8, weightDone: 40, rpe: null });
    });
    expect(result.current.phase).toBe('rest');
  });

  it('rest_duration=0 sur dernier set d\'un exercice → exercise_transition (pas dropset intra-bloc)', async () => {
    const squatEx = makeExercise('Squat', 80, 1);
    const setWithZeroRest = { ...squatEx.blocks[0].sets[0], rest_duration: 0 };
    const squatExWithZeroRest: WorkoutExerciseDetail = {
      ...squatEx,
      blocks: [{ ...squatEx.blocks[0], sets: [setWithZeroRest] }],
    };
    const { result } = renderHook(() =>
      useSession(1, [squatExWithZeroRest, makeExercise('Bench', 60, 1)], {
        sessionLogId: 1,
        position: { exerciseIdx: 0, blockIdx: 0, setIdx: 0 },
        phase: 'running',
        startedAt: Date.now(),
        setsLogged: 0,
        volume: 0,
      })
    );
    await act(async () => {
      await result.current.validateSet({ repsDone: 8, weightDone: 80, rpe: null });
    });
    expect(result.current.phase).toBe('exercise_transition');
  });
});

describe('useSession — substituteCurrentExercise', () => {
  const replacement: WorkoutExerciseDetail['exercise'] = {
    id: 99,
    name: 'Développé Haltères',
    type: 'musculation',
    technical_notes: null,
    muscle_groups: '["poitrine"]',
    description: null,
  };

  function makeSessionWithExercise() {
    const exercises = [makeExercise('Développé Barre', 80, 3)];
    return renderHook(() =>
      useSession(1, exercises, {
        sessionLogId: 1,
        position: { exerciseIdx: 0, blockIdx: 0, setIdx: 0 },
        phase: 'running',
        startedAt: Date.now(),
        setsLogged: 0,
        volume: 0,
      })
    );
  }

  it('currentExercise.exercise.name retourne le remplaçant après substitution', () => {
    const { result } = makeSessionWithExercise();
    expect(result.current.currentExercise?.exercise.name).toBe('Développé Barre');
    act(() => {
      result.current.substituteCurrentExercise(replacement);
    });
    expect(result.current.currentExercise?.exercise.name).toBe('Développé Haltères');
    expect(result.current.currentExercise?.exercise.id).toBe(99);
  });

  it('isCurrentExerciseSubstituted reflète l\'état de substitution', () => {
    const { result } = makeSessionWithExercise();
    expect(result.current.isCurrentExerciseSubstituted).toBe(false);
    act(() => {
      result.current.substituteCurrentExercise(replacement);
    });
    expect(result.current.isCurrentExerciseSubstituted).toBe(true);
  });

  it('currentSet reste inchangé après substitution — id, reps_min, weight identiques', () => {
    const { result } = makeSessionWithExercise();
    const setIdBefore = result.current.currentSet?.id;
    const repsMinBefore = result.current.currentSet?.reps_min;
    const weightBefore = result.current.currentSet?.weight;
    act(() => {
      result.current.substituteCurrentExercise(replacement);
    });
    expect(result.current.currentSet?.id).toBe(setIdBefore);
    expect(result.current.currentSet?.reps_min).toBe(repsMinBefore);
    expect(result.current.currentSet?.weight).toBe(weightBefore);
  });
});
