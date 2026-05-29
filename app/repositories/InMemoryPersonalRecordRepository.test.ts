import { InMemoryPersonalRecordRepository } from './InMemoryPersonalRecordRepository';
import { runPersonalRecordRepositoryContractTests } from './personalRecordRepository.contract';

describe('InMemoryPersonalRecordRepository', () => {
  runPersonalRecordRepositoryContractTests(() => new InMemoryPersonalRecordRepository());
});
