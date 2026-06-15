import { InMemoryBodyMeasurementRepository } from './InMemoryBodyMeasurementRepository';
import { runBodyMeasurementRepositoryContractTests } from './bodyMeasurementRepository.contract';

runBodyMeasurementRepositoryContractTests(() => new InMemoryBodyMeasurementRepository());
