import { InMemorySettingsRepository } from './InMemorySettingsRepository';
import { runSettingsRepositoryContractTests } from './settingsRepository.contract';

describe('InMemorySettingsRepository', () => {
  runSettingsRepositoryContractTests(() => new InMemorySettingsRepository());
});
