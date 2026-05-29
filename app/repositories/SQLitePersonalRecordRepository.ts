import { SQLiteDatabase } from 'expo-sqlite';
import type { PersonalRecord } from '../db/types';
import { IPersonalRecordRepository, CreatePersonalRecordDto } from './IPersonalRecordRepository';

export class SQLitePersonalRecordRepository implements IPersonalRecordRepository {
  constructor(private db: SQLiteDatabase) {}

  async save(dto: CreatePersonalRecordDto): Promise<PersonalRecord> {
    const result = await this.db.runAsync(
      'INSERT INTO personal_records (exercise_id, weight, reps, estimated_1rm, achieved_at, session_log_id) VALUES (?, ?, ?, ?, ?, ?)',
      [dto.exercise_id, dto.weight, dto.reps, dto.estimated_1rm, dto.achieved_at, dto.session_log_id]
    );
    const saved = await this.db.getFirstAsync<PersonalRecord>('SELECT * FROM personal_records WHERE id = ?', [result.lastInsertRowId]);
    if (!saved) throw new Error(`PersonalRecord ${result.lastInsertRowId} introuvable après insertion`);
    return saved;
  }

  async findBestByExerciseId(exerciseId: number): Promise<PersonalRecord | null> {
    return this.db.getFirstAsync<PersonalRecord>(
      'SELECT * FROM personal_records WHERE exercise_id = ? ORDER BY estimated_1rm DESC LIMIT 1',
      [exerciseId]
    );
  }

  async findAllByExerciseId(exerciseId: number): Promise<PersonalRecord[]> {
    return this.db.getAllAsync<PersonalRecord>(
      'SELECT * FROM personal_records WHERE exercise_id = ? ORDER BY achieved_at DESC',
      [exerciseId]
    );
  }

  async findRecent(limit: number): Promise<PersonalRecord[]> {
    return this.db.getAllAsync<PersonalRecord>(
      'SELECT * FROM personal_records ORDER BY achieved_at DESC LIMIT ?',
      [limit]
    );
  }
}
