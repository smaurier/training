import { InMemorySetRepository } from './InMemorySetRepository';
import { runSetRepositoryContractTests } from './setRepository.contract';

describe('InMemorySetRepository', () => {
  runSetRepositoryContractTests(() => new InMemorySetRepository());
});
