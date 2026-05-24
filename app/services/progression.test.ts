import { isSetAchieved, isSessionAchieved, calculateProgression } from './progression';

// --- isSetAchieved ---

describe('isSetAchieved', () => {
  it('retourne true quand les reps faites atteignent le minimum', () => {
    expect(isSetAchieved({ reps_done: 6, reps_min: 6 })).toBe(true);
  });

  it('retourne true quand les reps faites dépassent le minimum', () => {
    expect(isSetAchieved({ reps_done: 8, reps_min: 6 })).toBe(true);
  });

  it('retourne false quand les reps faites sont inférieures au minimum', () => {
    expect(isSetAchieved({ reps_done: 5, reps_min: 6 })).toBe(false);
  });
});

// --- isSessionAchieved ---

describe('isSessionAchieved', () => {
  it('retourne true quand toutes les séries de travail sont réussies', () => {
    const workSets = [
      { reps_done: 6, reps_min: 6 },
      { reps_done: 7, reps_min: 6 },
      { reps_done: 6, reps_min: 6 },
    ];
    expect(isSessionAchieved(workSets)).toBe(true);
  });

  it('retourne false si une seule série est ratée', () => {
    const workSets = [
      { reps_done: 6, reps_min: 6 },
      { reps_done: 5, reps_min: 6 },
      { reps_done: 6, reps_min: 6 },
    ];
    expect(isSessionAchieved(workSets)).toBe(false);
  });

  it('retourne false si la liste est vide', () => {
    expect(isSessionAchieved([])).toBe(false);
  });
});

// --- calculateProgression ---

describe('calculateProgression', () => {
  const baseConfig = {
    current_weight: 80,
    progression_step: 2,
    progression_threshold: 1,
    consecutive_successes: 0,
  };

  it('augmente le poids si la séance est réussie et le seuil atteint', () => {
    const workSets = [{ reps_done: 6, reps_min: 6 }];
    const result = calculateProgression(baseConfig, workSets);
    expect(result.new_weight).toBe(82);
    expect(result.progressed).toBe(true);
  });

  it('ne change pas le poids si la séance est ratée', () => {
    const workSets = [{ reps_done: 5, reps_min: 6 }];
    const result = calculateProgression(baseConfig, workSets);
    expect(result.new_weight).toBe(80);
    expect(result.progressed).toBe(false);
  });

  it('remet les succès consécutifs à zéro après un échec', () => {
    const config = { ...baseConfig, consecutive_successes: 1 };
    const workSets = [{ reps_done: 5, reps_min: 6 }];
    const result = calculateProgression(config, workSets);
    expect(result.consecutive_successes).toBe(0);
  });

  it('accumule les succès si le seuil est > 1', () => {
    const config = { ...baseConfig, progression_threshold: 3, consecutive_successes: 1 };
    const workSets = [{ reps_done: 6, reps_min: 6 }];
    const result = calculateProgression(config, workSets);
    expect(result.new_weight).toBe(80);   // pas encore progressé
    expect(result.consecutive_successes).toBe(2);
    expect(result.progressed).toBe(false);
  });

  it('progresse après N séances réussies consécutives', () => {
    const config = { ...baseConfig, progression_threshold: 3, consecutive_successes: 2 };
    const workSets = [{ reps_done: 6, reps_min: 6 }];
    const result = calculateProgression(config, workSets);
    expect(result.new_weight).toBe(82);
    expect(result.progressed).toBe(true);
    expect(result.consecutive_successes).toBe(0); // reset après progression
  });
});
