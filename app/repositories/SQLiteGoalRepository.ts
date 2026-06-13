import type { SQLiteDatabase, SQLiteBindValue } from 'expo-sqlite';
import type { IGoalRepository } from './IGoalRepository';
import type { Goal, CreateGoalDto } from '../db/types';

export class SQLiteGoalRepository implements IGoalRepository {
  constructor(private db: SQLiteDatabase) {}

  async save(dto: CreateGoalDto): Promise<Goal> {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO goals (exercise_id, target_weight, target_date) VALUES (?, ?, ?)`,
      [dto.exercise_id, dto.target_weight, dto.target_date],
    );
    const row = await this.db.getFirstAsync<Goal>(
      'SELECT * FROM goals WHERE exercise_id = ?',
      [dto.exercise_id],
    );
    return row!;
  }

  async findByExerciseId(exerciseId: number): Promise<Goal | null> {
    return (await this.db.getFirstAsync<Goal>(
      'SELECT * FROM goals WHERE exercise_id = ?',
      [exerciseId],
    )) ?? null;
  }

  async findAll(): Promise<Goal[]> {
    return this.db.getAllAsync<Goal>('SELECT * FROM goals ORDER BY created_at DESC');
  }

  async update(id: number, patch: Partial<Pick<Goal, 'achieved_at' | 'target_weight' | 'target_date'>>): Promise<void> {
    const entries = (Object.entries(patch) as [string, SQLiteBindValue][]).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return;
    const sets = entries.map(([k]) => `${k} = ?`).join(', ');
    const values: SQLiteBindValue[] = entries.map(([, v]) => v);
    await this.db.runAsync(`UPDATE goals SET ${sets} WHERE id = ?`, [...values, id]);
  }

  async delete(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM goals WHERE id = ?', [id]);
  }
}
