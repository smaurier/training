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

  async countBySessionLogIds(ids: number[]): Promise<Record<number, number>> {
    if (ids.length === 0) return {};
    const placeholders = ids.map(() => '?').join(',');
    const rows = await this.db.getAllAsync<{ session_log_id: number; cnt: number }>(
      `SELECT session_log_id, COUNT(*) as cnt FROM set_logs WHERE session_log_id IN (${placeholders}) GROUP BY session_log_id`,
      ids
    );
    const result: Record<number, number> = {};
    for (const row of rows) {
      result[row.session_log_id] = row.cnt;
    }
    return result;
  }

  async findByExerciseId(exerciseId: number): Promise<SetLog[]> {
    return this.db.getAllAsync<SetLog>(
      'SELECT * FROM set_logs WHERE exercise_id = ? ORDER BY completed_at ASC',
      [exerciseId]
    );
  }

  async findFromDate(from: string): Promise<SetLog[]> {
    return this.db.getAllAsync<SetLog>(
      'SELECT * FROM set_logs WHERE completed_at >= ? ORDER BY completed_at ASC',
      [from]
    );
  }

  async findDistinctExerciseIds(): Promise<number[]> {
    const rows = await this.db.getAllAsync<{ exercise_id: number }>(
      'SELECT DISTINCT exercise_id FROM set_logs'
    );
    return rows.map(r => r.exercise_id);
  }
}
