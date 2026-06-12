export function shouldWarnAbandon(
  pausedWorkoutId: number,
  targetWorkoutId: number,
): boolean {
  return pausedWorkoutId !== targetWorkoutId;
}
