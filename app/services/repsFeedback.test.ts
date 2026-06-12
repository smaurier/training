import { computeRepsFeedback } from './repsFeedback';

describe('computeRepsFeedback', () => {
  it('retourne null si bodyweight', () => {
    expect(computeRepsFeedback('10', 5, true)).toBeNull();
  });
  it('retourne null si reps vide', () => {
    expect(computeRepsFeedback('', 5, false)).toBeNull();
  });
  it('retourne null si reps non-numérique', () => {
    expect(computeRepsFeedback('abc', 5, false)).toBeNull();
  });
  it('retourne null si dans la cible', () => {
    expect(computeRepsFeedback('5', 5, false)).toBeNull();
  });
  it('retourne null exactement à repsMin * 1.25 (6 <= 6.25)', () => {
    expect(computeRepsFeedback('6', 5, false)).toBeNull();
  });
  it('retourne message "dépasse" si reps > repsMin * 1.25 (7 > 6.25)', () => {
    expect(computeRepsFeedback('7', 5, false)).toBe(
      "Tu dépasses la cible — envisage d'augmenter le poids."
    );
  });
  it('retourne null exactement à repsMin * 0.75 (4 >= 3.75)', () => {
    expect(computeRepsFeedback('4', 5, false)).toBeNull();
  });
  it('retourne message "en dessous" si reps < repsMin * 0.75 (3 < 3.75)', () => {
    expect(computeRepsFeedback('3', 5, false)).toBe(
      "Tu es en dessous de la cible — le poids est peut-être trop lourd."
    );
  });
});
