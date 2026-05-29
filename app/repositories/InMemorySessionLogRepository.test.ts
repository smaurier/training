import { InMemorySessionLogRepository } from './InMemorySessionLogRepository';
import { runSessionLogRepositoryContractTests } from './sessionLogRepository.contract';

describe('InMemorySessionLogRepository', () => {
  runSessionLogRepositoryContractTests(() => new InMemorySessionLogRepository());
});
