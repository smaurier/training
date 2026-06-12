import { shouldWarnAbandon } from './sessionUtils';

describe('shouldWarnAbandon', () => {
  it('retourne true si les workoutId sont différents', () => {
    expect(shouldWarnAbandon(1, 2)).toBe(true);
  });

  it('retourne false si les workoutId sont identiques', () => {
    expect(shouldWarnAbandon(1, 1)).toBe(false);
  });
});
