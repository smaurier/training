import { InMemoryBlockRepository } from './InMemoryBlockRepository';
import { runBlockRepositoryContractTests } from './blockRepository.contract';

describe('InMemoryBlockRepository', () => {
  runBlockRepositoryContractTests(() => new InMemoryBlockRepository());
});
