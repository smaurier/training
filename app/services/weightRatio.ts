import type { WorkoutExerciseDetail } from './WorkoutExerciseService';

export function resolveWeights(exercise: WorkoutExerciseDetail): WorkoutExerciseDetail {
  const travailWeight = exercise.blocks
    .find(b => b.name === 'Travail')
    ?.sets[0]?.weight ?? null;

  if (travailWeight === null) return exercise;

  const resolvedBlocks = exercise.blocks.map(block => ({
    ...block,
    sets: block.sets.map(set => {
      if (set.weight_ratio == null || set.weight != null) return set;
      return { ...set, weight: Math.round(travailWeight * set.weight_ratio / 2) * 2 };
    }),
  }));

  return { ...exercise, blocks: resolvedBlocks };
}
