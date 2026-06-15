import { SQLiteBodyMeasurementRepository } from './SQLiteBodyMeasurementRepository';
import { runBodyMeasurementRepositoryContractTests } from './bodyMeasurementRepository.contract';
import { openDatabaseSync } from 'expo-sqlite';
import { runMigrations } from '../db/migrations';

runBodyMeasurementRepositoryContractTests(() => {
  const db = openDatabaseSync(':memory:');
  runMigrations(db);
  return new SQLiteBodyMeasurementRepository(db);
});
