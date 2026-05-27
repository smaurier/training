import { InMemoryProgramRepository } from './InMemoryProgramRepository';
import { runProgramRepositoryContractTests } from './programRepository.contract';

describe('InMemoryProgramRepository', () => {
  runProgramRepositoryContractTests(() => new InMemoryProgramRepository());
});
