import { InMemorySetLogRepository } from './InMemorySetLogRepository';
import { runSetLogRepositoryContractTests } from './setLogRepository.contract';

describe('InMemorySetLogRepository', () => {
  runSetLogRepositoryContractTests(() => new InMemorySetLogRepository());
});
