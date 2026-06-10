// Logique pure extraite de RunningPhase pour être testable sans React Native renderer
type ExerciseType = 'musculation' | 'etirement' | 'cardio';

function computeIsDuration(type: ExerciseType, durationSeconds: number | null): boolean {
  if (type === 'cardio') return false;
  if (type === 'etirement') return false;
  return (durationSeconds ?? 0) > 0;
}

describe('computeIsDuration', () => {
  it('returns false for cardio regardless of duration_seconds', () => {
    expect(computeIsDuration('cardio', 30)).toBe(false);
    expect(computeIsDuration('cardio', null)).toBe(false);
  });

  it('returns false for etirement regardless of duration_seconds', () => {
    expect(computeIsDuration('etirement', 10)).toBe(false);
    expect(computeIsDuration('etirement', 0)).toBe(false);
    expect(computeIsDuration('etirement', null)).toBe(false);
  });

  it('returns true for musculation with duration_seconds > 0', () => {
    expect(computeIsDuration('musculation', 60)).toBe(true);
  });

  it('returns false for musculation without duration_seconds', () => {
    expect(computeIsDuration('musculation', null)).toBe(false);
    expect(computeIsDuration('musculation', 0)).toBe(false);
  });
});
