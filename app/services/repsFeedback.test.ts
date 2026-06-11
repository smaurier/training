import { computeRepsFeedback } from './repsFeedback';

describe('computeRepsFeedback', () => {
  it('retourne null si bodyweight', () => {
    expect(computeRepsFeedback('10', 5, 8, true)).toBeNull();
  });
  it('retourne null si reps vide', () => {
    expect(computeRepsFeedback('', 5, 8, false)).toBeNull();
  });
  it('retourne null si reps non-numérique', () => {
    expect(computeRepsFeedback('abc', 5, 8, false)).toBeNull();
  });
  it('retourne null si dans la plage cible', () => {
    expect(computeRepsFeedback('6', 5, 8, false)).toBeNull();
  });
  it('retourne null exactement à reps_max * 1.25', () => {
    // 8 * 1.25 = 10 → pas au-dessus → null
    expect(computeRepsFeedback('10', 5, 8, false)).toBeNull();
  });
  it('retourne message "dépasse" si reps > reps_max * 1.25', () => {
    // 8 * 1.25 = 10, 11 dépasse
    expect(computeRepsFeedback('11', 5, 8, false)).toBe(
      "Tu dépasses la cible — envisage d'augmenter le poids."
    );
  });
  it('retourne null exactement à reps_min * 0.75', () => {
    // 5 * 0.75 = 3.75, 4 >= 3.75 → null
    expect(computeRepsFeedback('4', 5, 8, false)).toBeNull();
  });
  it('retourne message "en dessous" si reps < reps_min * 0.75', () => {
    // 5 * 0.75 = 3.75, 3 < 3.75
    expect(computeRepsFeedback('3', 5, 8, false)).toBe(
      "Tu es en dessous de la cible — le poids est peut-être trop lourd."
    );
  });
});
