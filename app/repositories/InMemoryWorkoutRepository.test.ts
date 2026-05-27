import { InMemoryWorkoutRepository } from './InMemoryWorkoutRepository';
import { runWorkoutRepositoryContractTests } from './workoutRepository.contract';

describe('InMemoryWorkoutRepository', () => {
  runWorkoutRepositoryContractTests(() => new InMemoryWorkoutRepository());
});
