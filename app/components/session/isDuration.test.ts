// Logique pure extraite de RunningPhase pour être testable sans React Native renderer
type ExerciseType = 'musculation' | 'etirement' | 'cardio';

function computeIsDuration(type: ExerciseType, durationSeconds: number | null): boolean {
  if (type === 'cardio') return false;
  return (durationSeconds ?? 0) > 0;
}

describe('computeIsDuration', () => {
  it('returns false for cardio regardless of duration_seconds', () => {
    expect(computeIsDuration('cardio', 30)).toBe(false);
    expect(computeIsDuration('cardio', null)).toBe(false);
  });

  it('returns true for etirement with duration_seconds > 0 (timed holds)', () => {
    expect(computeIsDuration('etirement', 60)).toBe(true);  // Deep squat hold
    expect(computeIsDuration('etirement', 30)).toBe(true);  // Suspension passive
  });

  it('returns false for etirement without duration_seconds (reps-based mobility)', () => {
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
