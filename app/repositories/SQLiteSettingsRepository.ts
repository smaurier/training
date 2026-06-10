import type { SQLiteDatabase } from 'expo-sqlite';
import type { ISettingsRepository } from './ISettingsRepository';

export class SQLiteSettingsRepository implements ISettingsRepository {
  constructor(private db: SQLiteDatabase) {}

  async get(key: string): Promise<string | null> {
    const row = await this.db.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      [key]
    );
    return row?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    await this.db.runAsync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  }
}
