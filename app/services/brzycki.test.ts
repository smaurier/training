import { compute1RM, suggestWorkingWeight } from './brzycki';

describe('compute1RM', () => {
  it('80kg × 10 reps → ~106.7kg', () => {
    expect(compute1RM(80, 10)).toBeCloseTo(106.7, 0);
  });

  it('100kg × 1 rep → 100kg (dénominateur = 1)', () => {
    expect(compute1RM(100, 1)).toBeCloseTo(100, 1);
  });

  it('60kg × 5 reps → ~67.5kg', () => {
    expect(compute1RM(60, 5)).toBeCloseTo(67.5, 0);
  });

  it('clampe les reps à 12 (formule peu fiable au-delà)', () => {
    expect(compute1RM(50, 15)).toEqual(compute1RM(50, 12));
  });
});

describe('suggestWorkingWeight', () => {
  it('circulaire : poids test = suggestion pour mêmes reps', () => {
    const oneRM = compute1RM(80, 10);
    expect(suggestWorkingWeight(oneRM, 10)).toBe(80);
  });

  it('moins de reps cibles → charge plus lourde', () => {
    const oneRM = 100;
    expect(suggestWorkingWeight(oneRM, 5)).toBeGreaterThan(suggestWorkingWeight(oneRM, 10));
  });

  it('arrondit au pas de 2.5 par défaut', () => {
    const result = suggestWorkingWeight(100, 10);
    expect(result % 2.5).toBe(0);
  });

  it('arrondit au pas personnalisé', () => {
    const result = suggestWorkingWeight(100, 10, 5);
    expect(result % 5).toBe(0);
  });

  it('retourne au moins le pas (jamais 0)', () => {
    expect(suggestWorkingWeight(5, 10)).toBeGreaterThanOrEqual(2.5);
  });
});
