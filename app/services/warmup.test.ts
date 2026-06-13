import { computeWarmupSets, shouldShowWarmup } from './warmup';

describe('computeWarmupSets', () => {
  it('60 kg → 24/36/48 kg', () => {
    expect(computeWarmupSets(60)).toEqual([
      { weight: 24, reps: 8, rest: 60, percent: 40 },
      { weight: 36, reps: 5, rest: 60, percent: 60 },
      { weight: 48, reps: 2, rest: 90, percent: 80 },
    ]);
  });

  it('arrondit au 2 kg inférieur — 65 kg → 26/38/52', () => {
    const sets = computeWarmupSets(65);
    // 65×0.4=26.0 → 26, 65×0.6=39.0 → 38, 65×0.8=52.0 → 52
    expect(sets[0]!.weight).toBe(26);
    expect(sets[1]!.weight).toBe(38);
    expect(sets[2]!.weight).toBe(52);
  });

  it('50 kg → 20/30/40', () => {
    expect(computeWarmupSets(50)).toEqual([
      { weight: 20, reps: 8, rest: 60, percent: 40 },
      { weight: 30, reps: 5, rest: 60, percent: 60 },
      { weight: 40, reps: 2, rest: 90, percent: 80 },
    ]);
  });

  it('exactement au seuil — 40 kg → 16/24/32', () => {
    expect(computeWarmupSets(40)).toEqual([
      { weight: 16, reps: 8, rest: 60, percent: 40 },
      { weight: 24, reps: 5, rest: 60, percent: 60 },
      { weight: 32, reps: 2, rest: 90, percent: 80 },
    ]);
  });

  it('100 kg → 40/60/80', () => {
    expect(computeWarmupSets(100)).toEqual([
      { weight: 40, reps: 8, rest: 60, percent: 40 },
      { weight: 60, reps: 5, rest: 60, percent: 60 },
      { weight: 80, reps: 2, rest: 90, percent: 80 },
    ]);
  });

  it('plateStep 2.5 — 100 kg → 40/60/80 (multiples de 2.5)', () => {
    // 100×0.4=40, floor(40/2.5)×2.5=40
    // 100×0.6=60, floor(60/2.5)×2.5=60
    // 100×0.8=80, floor(80/2.5)×2.5=80
    expect(computeWarmupSets(100, 2.5)).toEqual([
      { weight: 40, reps: 8, rest: 60, percent: 40 },
      { weight: 60, reps: 5, rest: 60, percent: 60 },
      { weight: 80, reps: 2, rest: 90, percent: 80 },
    ]);
  });

  it('plateStep 5 — 65 kg → 25/35/50 (multiples de 5)', () => {
    // 65×0.4=26, floor(26/5)×5=25
    // 65×0.6=39, floor(39/5)×5=35
    // 65×0.8=52, floor(52/5)×5=50
    expect(computeWarmupSets(65, 5)).toEqual([
      { weight: 25, reps: 8, rest: 60, percent: 40 },
      { weight: 35, reps: 5, rest: 60, percent: 60 },
      { weight: 50, reps: 2, rest: 90, percent: 80 },
    ]);
  });

  it('défaut plateStep=2 — comportement inchangé', () => {
    expect(computeWarmupSets(60)).toEqual([
      { weight: 24, reps: 8, rest: 60, percent: 40 },
      { weight: 36, reps: 5, rest: 60, percent: 60 },
      { weight: 48, reps: 2, rest: 90, percent: 80 },
    ]);
  });
});

describe('shouldShowWarmup', () => {
  it('fixed ≥ 40 kg → true', () => expect(shouldShowWarmup(60, 'fixed')).toBe(true));
  it('fixed exactement 40 kg → true', () => expect(shouldShowWarmup(40, 'fixed')).toBe(true));
  it('fixed < 40 kg → false', () => expect(shouldShowWarmup(39, 'fixed')).toBe(false));
  it('fixed 0 (poids non encore saisi) → false', () => expect(shouldShowWarmup(0, 'fixed')).toBe(false));
  it('bodyweight → false', () => expect(shouldShowWarmup(60, 'bodyweight')).toBe(false));
  it('bar → false', () => expect(shouldShowWarmup(60, 'bar')).toBe(false));
});
