export interface SetResult {
  reps_done: number;
  reps_min: number;
}

export interface ProgressionConfig {
  current_weight: number;
  progression_step: number;
  progression_threshold: number;
  consecutive_successes: number;
}

export interface ProgressionResult {
  new_weight: number;
  consecutive_successes: number;
  progressed: boolean;
}

export function isSetAchieved(set: SetResult): boolean {
  return set.reps_done >= set.reps_min;
}

export function isSessionAchieved(workSets: SetResult[]): boolean {
  if (workSets.length === 0) return false;
  return workSets.every(isSetAchieved);
}

export function calculateProgression(
  config: ProgressionConfig,
  workSets: SetResult[]
): ProgressionResult {
  if (!isSessionAchieved(workSets)) {
    return {
      new_weight: config.current_weight,
      consecutive_successes: 0,
      progressed: false,
    };
  }

  const newSuccesses = config.consecutive_successes + 1;

  if (newSuccesses >= config.progression_threshold) {
    return {
      new_weight: config.current_weight + config.progression_step,
      consecutive_successes: 0,
      progressed: true,
    };
  }

  return {
    new_weight: config.current_weight,
    consecutive_successes: newSuccesses,
    progressed: false,
  };
}

export function applyProgression(weight: number): number {
  return Math.ceil((weight * 1.025) / 2) * 2;
}

export function applyDeload(weight: number): number {
  return Math.floor((weight * 0.9) / 2) * 2;
}

export function isSessionFullSuccess(workSets: SetResult[]): boolean {
  if (workSets.length === 0) return false;
  return workSets.every(s => s.reps_done >= s.reps_min);
}

export function isSessionSignificantFailure(workSets: SetResult[]): boolean {
  return workSets.some(s => s.reps_done <= s.reps_min - 2);
}
