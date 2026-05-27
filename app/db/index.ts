import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';
import { seedExercises } from './seeds';

let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('training.db');
    _db.execSync('PRAGMA foreign_keys = ON');
  }
  return _db;
}

export async function initDatabase(): Promise<void> {
  const db = getDb();
  await runMigrations(db);
  await seedExercises(db);
}
