import { SQLiteDatabase } from 'expo-sqlite';
import type { SetLog } from '../db/types';
import { ISetLogRepository, CreateSetLogDto } from './ISetLogRepository';

export class SQLiteSetLogRepository implements ISetLogRepository {
  constructor(private db: SQLiteDatabase) {}

  async save(dto: CreateSetLogDto): Promise<SetLog> {
    const result = await this.db.runAsync(
      'INSERT INTO set_logs (session_log_id, set_id, exercise_id, reps_done, weight_done, rpe, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [dto.session_log_id, dto.set_id, dto.exercise_id, dto.reps_done, dto.weight_done, dto.rpe, dto.completed_at]
    );
    const saved = await this.db.getFirstAsync<SetLog>('SELECT * FROM set_logs WHERE id = ?', [result.lastInsertRowId]);
    if (!saved) throw new Error(`SetLog ${result.lastInsertRowId} introuvable après insertion`);
    return saved;
  }

  async findBySessionLogId(sessionLogId: number): Promise<SetLog[]> {
    return this.db.getAllAsync<SetLog>(
      'SELECT * FROM set_logs WHERE session_log_id = ?',
      [sessionLogId]
    );
  }

  async findBySetId(setId: number): Promise<SetLog[]> {
    return this.db.getAllAsync<SetLog>(
      'SELECT * FROM set_logs WHERE set_id = ? ORDER BY completed_at DESC',
      [setId]
    );
  }
}
