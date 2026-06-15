jest.mock('expo-sqlite');

import { SQLiteBodyMeasurementRepository } from './SQLiteBodyMeasurementRepository';
import { runBodyMeasurementRepositoryContractTests } from './bodyMeasurementRepository.contract';
import { openDatabaseSync } from 'expo-sqlite';
import { runMigrations } from '../db/migrations';

runBodyMeasurementRepositoryContractTests(async () => {
  const db = openDatabaseSync(':memory:');
  await runMigrations(db);
  return new SQLiteBodyMeasurementRepository(db);
});
