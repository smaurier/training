import {
  isSetAchieved, isSessionAchieved, calculateProgression,
  applyProgression, applyDeload, isSessionFullSuccess, isSessionSignificantFailure,
} from './progression';

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

// --- applyProgression ---

describe('applyProgression', () => {
  it('arrondit au 2kg supérieur — 60kg', () => {
    expect(applyProgression(60)).toBe(62); // 60 * 1.025 = 61.5 → ceil to 62
  });

  it('arrondit au 2kg supérieur — 40kg', () => {
    expect(applyProgression(40)).toBe(42); // 40 * 1.025 = 41 → ceil(41/2)*2 = 42
  });

  it('minimum +2kg quelle que soit la charge', () => {
    expect(applyProgression(20)).toBe(22); // 20 * 1.025 = 20.5 → ceil(10.25)*2 = 22
  });
});

// --- applyDeload ---

describe('applyDeload', () => {
  it('arrondit au 2kg inférieur — 60kg', () => {
    expect(applyDeload(60)).toBe(54); // 60 * 0.9 = 54 → floor(27)*2 = 54
  });

  it('arrondit au 2kg inférieur — 40kg', () => {
    expect(applyDeload(40)).toBe(36); // 40 * 0.9 = 36 → floor(18)*2 = 36
  });
});

// --- isSessionFullSuccess ---

describe('isSessionFullSuccess', () => {
  it('true si toutes les séries atteignent la cible', () => {
    expect(isSessionFullSuccess([
      { reps_done: 8, reps_min: 8 },
      { reps_done: 8, reps_min: 8 },
      { reps_done: 9, reps_min: 8 },
    ])).toBe(true);
  });

  it('false si une série rate la cible d\'1 rep', () => {
    expect(isSessionFullSuccess([
      { reps_done: 7, reps_min: 8 },
      { reps_done: 8, reps_min: 8 },
    ])).toBe(false);
  });

  it('false si liste vide', () => {
    expect(isSessionFullSuccess([])).toBe(false);
  });
});

// --- isSessionSignificantFailure ---

describe('isSessionSignificantFailure', () => {
  it('true si au moins une série est à 2 reps sous la cible', () => {
    expect(isSessionSignificantFailure([
      { reps_done: 6, reps_min: 8 },
      { reps_done: 8, reps_min: 8 },
    ])).toBe(true);
  });

  it('false si le manque est d\'1 rep seulement', () => {
    expect(isSessionSignificantFailure([
      { reps_done: 7, reps_min: 8 },
      { reps_done: 8, reps_min: 8 },
    ])).toBe(false);
  });

  it('false si toutes les séries réussies', () => {
    expect(isSessionSignificantFailure([
      { reps_done: 8, reps_min: 8 },
      { reps_done: 8, reps_min: 8 },
    ])).toBe(false);
  });
});
