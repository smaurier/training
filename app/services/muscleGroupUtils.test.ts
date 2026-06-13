import { getMacroCategory, computeVolumeByMuscleGroup } from './muscleGroupUtils';
import type { SetLog, Exercise } from '../db/types';

function makeSetLog(exercise_id: number, reps: number, weight: number, completed_at = '2026-06-01T10:00:00.000Z'): SetLog {
  return { id: 1, session_log_id: 1, set_id: 1, exercise_id, reps_done: reps, weight_done: weight, rpe: null, completed_at, duration_seconds: null, distance_meters: null };
}

function makeExercise(id: number, muscle_groups: string[]): Exercise {
  return { id, muscle_groups: JSON.stringify(muscle_groups), name: 'Test', type: 'musculation', technical_notes: null, description: null, is_custom: 0, progression_step: 2, progression_threshold: 1, created_at: '2026-01-01T00:00:00.000Z' };
}

describe('getMacroCategory', () => {
  it("'pectoraux' → 'Push'", () => expect(getMacroCategory('pectoraux')).toBe('Push'));
  it("'grand dorsal' → 'Pull'", () => expect(getMacroCategory('grand dorsal')).toBe('Pull'));
  it("'quadriceps' → 'Jambes'", () => expect(getMacroCategory('quadriceps')).toBe('Jambes'));
  it("'abdominaux' → 'Gainage'", () => expect(getMacroCategory('abdominaux')).toBe('Gainage'));
  it("muscle inconnu → 'Autre'", () => expect(getMacroCategory('inconnu')).toBe('Autre'));
});

describe('computeVolumeByMuscleGroup', () => {
  it('retourne [] si setLogs vide', () => {
    expect(computeVolumeByMuscleGroup([], new Map())).toEqual([]);
  });

  it('attribue volume Push pour exercice pectoraux (10×80=800)', () => {
    const map = new Map([[1, makeExercise(1, ['pectoraux', 'triceps'])]]);
    const result = computeVolumeByMuscleGroup([makeSetLog(1, 10, 80)], map);
    expect(result.find(r => r.category === 'Push')?.volume).toBe(800);
  });

  it('compte Push une seule fois même avec 3 muscles Push', () => {
    const map = new Map([[1, makeExercise(1, ['pectoraux', 'triceps', 'deltoïdes antérieurs'])]]);
    const result = computeVolumeByMuscleGroup([makeSetLog(1, 10, 80)], map);
    expect(result.find(r => r.category === 'Push')?.volume).toBe(800);
  });

  it('attribue aux deux catégories pour exercice Jambes+Gainage (Squat)', () => {
    const map = new Map([[1, makeExercise(1, ['quadriceps', 'fessiers', 'érecteurs du rachis'])]]);
    const result = computeVolumeByMuscleGroup([makeSetLog(1, 5, 100)], map);
    expect(result.find(r => r.category === 'Jambes')?.volume).toBe(500);
    expect(result.find(r => r.category === 'Gainage')?.volume).toBe(500);
  });

  it('calcule pourcentages : Push 800 + Pull 200 → 80% / 20%', () => {
    const map = new Map([
      [1, makeExercise(1, ['pectoraux'])],
      [2, makeExercise(2, ['grand dorsal'])],
    ]);
    const result = computeVolumeByMuscleGroup([
      makeSetLog(1, 10, 80),
      makeSetLog(2, 10, 20),
    ], map);
    expect(result.find(r => r.category === 'Push')?.percentage).toBe(80);
    expect(result.find(r => r.category === 'Pull')?.percentage).toBe(20);
  });

  it('trie muscles par volume DESC dans le détail', () => {
    const map = new Map([
      [1, makeExercise(1, ['pectoraux', 'triceps'])],
      [2, makeExercise(2, ['triceps'])],
    ]);
    const result = computeVolumeByMuscleGroup([
      makeSetLog(1, 10, 80),  // pectoraux=800, triceps=800
      makeSetLog(2, 10, 50),  // triceps+=500 → 1300
    ], map);
    const muscles = result.find(r => r.category === 'Push')?.muscles ?? [];
    expect(muscles[0].muscle).toBe('triceps');  // 1300 > pectoraux 800
  });

  it('ignore exercice absent de exerciseMap', () => {
    const result = computeVolumeByMuscleGroup([makeSetLog(99, 10, 80)], new Map());
    expect(result).toEqual([]);
  });

  it("retourne [] si muscle_groups est '[]'", () => {
    const map = new Map([[1, makeExercise(1, [])]]);
    expect(computeVolumeByMuscleGroup([makeSetLog(1, 10, 80)], map)).toEqual([]);
  });
});
