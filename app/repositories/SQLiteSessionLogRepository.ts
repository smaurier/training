import { SQLiteDatabase } from 'expo-sqlite';
import type { SessionLog } from '../db/types';
import { ISessionLogRepository, CreateSessionLogDto } from './ISessionLogRepository';

export class SQLiteSessionLogRepository implements ISessionLogRepository {
  constructor(private db: SQLiteDatabase) {}

  async save(dto: CreateSessionLogDto): Promise<SessionLog> {
    const result = await this.db.runAsync(
      'INSERT INTO session_logs (workout_id, started_at, checkin_energy, checkin_fatigue, checkin_sleep, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [dto.workout_id, dto.started_at, dto.checkin_energy, dto.checkin_fatigue, dto.checkin_sleep, dto.notes]
    );
    const saved = await this.findById(result.lastInsertRowId);
    if (!saved) throw new Error(`SessionLog ${result.lastInsertRowId} introuvable après insertion`);
    return saved;
  }

  async findById(id: number): Promise<SessionLog | null> {
    return this.db.getFirstAsync<SessionLog>('SELECT * FROM session_logs WHERE id = ?', [id]);
  }

  async findByWorkoutId(workoutId: number): Promise<SessionLog[]> {
    return this.db.getAllAsync<SessionLog>(
      'SELECT * FROM session_logs WHERE workout_id = ? ORDER BY started_at DESC',
      [workoutId]
    );
  }

  async findLatestByWorkoutIds(workoutIds: number[]): Promise<SessionLog | null> {
    if (workoutIds.length === 0) return null;
    const placeholders = workoutIds.map(() => '?').join(',');
    return this.db.getFirstAsync<SessionLog>(
      `SELECT * FROM session_logs WHERE workout_id IN (${placeholders}) ORDER BY started_at DESC LIMIT 1`,
      workoutIds
    );
  }

  async complete(id: number, endedAt: string): Promise<void> {
    await this.db.runAsync('UPDATE session_logs SET ended_at = ? WHERE id = ?', [endedAt, id]);
  }

  async findAll(): Promise<SessionLog[]> {
    return this.db.getAllAsync<SessionLog>(
      'SELECT * FROM session_logs ORDER BY started_at DESC'
    );
  }
}
