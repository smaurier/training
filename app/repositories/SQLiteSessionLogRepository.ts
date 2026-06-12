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
      `SELECT * FROM session_logs WHERE workout_id IN (${placeholders}) AND status = 'completed' ORDER BY started_at DESC LIMIT 1`,
      workoutIds
    );
  }

  async findLatestDatesPerWorkout(workoutIds: number[]): Promise<Map<number, string | null>> {
    const result = new Map<number, string | null>();
    for (const id of workoutIds) result.set(id, null);
    if (workoutIds.length === 0) return result;
    const placeholders = workoutIds.map(() => '?').join(',');
    const rows = await this.db.getAllAsync<{ workout_id: number; last_started: string | null }>(
      `SELECT workout_id, MAX(started_at) AS last_started FROM session_logs WHERE workout_id IN (${placeholders}) GROUP BY workout_id`,
      workoutIds
    );
    for (const row of rows) result.set(row.workout_id, row.last_started);
    return result;
  }

  async complete(id: number, endedAt: string): Promise<void> {
    await this.db.runAsync(
      "UPDATE session_logs SET ended_at = ?, status = 'completed' WHERE id = ?",
      [endedAt, id]
    );
  }

  async pause(id: number, position: string): Promise<void> {
    await this.db.runAsync(
      "UPDATE session_logs SET status = 'paused', paused_position = ? WHERE id = ?",
      [position, id]
    );
  }

  async abandon(id: number, endedAt: string): Promise<void> {
    await this.db.runAsync(
      "UPDATE session_logs SET status = 'abandoned', ended_at = ? WHERE id = ?",
      [endedAt, id]
    );
  }

  async findAnyPaused(): Promise<SessionLog | null> {
    return this.db.getFirstAsync<SessionLog>(
      "SELECT * FROM session_logs WHERE status = 'paused' ORDER BY started_at DESC LIMIT 1"
    );
  }

  async findAll(): Promise<SessionLog[]> {
    return this.db.getAllAsync<SessionLog>(
      'SELECT * FROM session_logs ORDER BY started_at DESC'
    );
  }

  async getLastCompletedWorkoutId(workoutIds: number[]): Promise<number | null> {
    if (workoutIds.length === 0) return null;
    const placeholders = workoutIds.map(() => '?').join(',');
    const row = await this.db.getFirstAsync<{ workout_id: number }>(
      `SELECT workout_id FROM session_logs WHERE workout_id IN (${placeholders}) AND ended_at IS NOT NULL ORDER BY ended_at DESC LIMIT 1`,
      workoutIds
    );
    return row?.workout_id ?? null;
  }
}
