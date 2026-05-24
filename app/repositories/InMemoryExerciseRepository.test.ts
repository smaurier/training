import { InMemoryExerciseRepository } from './InMemoryExerciseRepository';
import { runExerciseRepositoryContractTests } from './exerciseRepository.contract';

describe('InMemoryExerciseRepository', () => {
  runExerciseRepositoryContractTests(() => new InMemoryExerciseRepository());
});
