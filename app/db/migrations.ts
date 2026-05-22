import type { SQLiteDatabase } from 'expo-sqlite';
import { MIGRATIONS } from './schema';

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('PRAGMA journal_mode = WAL');
  await db.runAsync('PRAGMA foreign_keys = ON');

  const result = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const currentVersion = result?.user_version ?? 0;

  for (let i = currentVersion; i < MIGRATIONS.length; i++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[i]);
      await db.runAsync(`PRAGMA user_version = ${i + 1}`);
    });
  }
}
