import { InMemoryWorkoutExerciseRepository } from './InMemoryWorkoutExerciseRepository';
import { runWorkoutExerciseRepositoryContractTests } from './workoutExerciseRepository.contract';

describe('InMemoryWorkoutExerciseRepository', () => {
  runWorkoutExerciseRepositoryContractTests(() => new InMemoryWorkoutExerciseRepository());
});
