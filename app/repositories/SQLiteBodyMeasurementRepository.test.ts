jest.mock('expo-sqlite');

/* eslint-disable import/first */
import { SQLiteBodyMeasurementRepository } from './SQLiteBodyMeasurementRepository';
import { runBodyMeasurementRepositoryContractTests } from './bodyMeasurementRepository.contract';
import { openDatabaseSync } from 'expo-sqlite';
import { runMigrations } from '../db/migrations';
/* eslint-enable import/first */

runBodyMeasurementRepositoryContractTests(async () => {
  const db = openDatabaseSync(':memory:');
  await runMigrations(db);
  return new SQLiteBodyMeasurementRepository(db);
});
