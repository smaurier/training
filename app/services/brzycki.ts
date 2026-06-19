const MAX_REPS = 12;

export function compute1RM(weight: number, reps: number): number {
  const r = Math.min(reps, MAX_REPS);
  return weight / (1.0278 - 0.0278 * r);
}

export function suggestWorkingWeight(oneRM: number, targetReps: number, plateStep = 2.5): number {
  const r = Math.min(targetReps, MAX_REPS);
  const raw = oneRM * (1.0278 - 0.0278 * r);
  return Math.max(plateStep, Math.round(raw / plateStep) * plateStep);
}
