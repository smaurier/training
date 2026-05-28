import { SQLiteDatabase } from 'expo-sqlite';
import type { Block } from '../db/types';
import { IBlockRepository, CreateBlockDto, UpdateBlockDto } from './IBlockRepository';

export class SQLiteBlockRepository implements IBlockRepository {
  constructor(private db: SQLiteDatabase) {}

  async findByWorkoutExerciseId(workoutExerciseId: number): Promise<Block[]> {
    return this.db.getAllAsync<Block>(
      'SELECT * FROM blocks WHERE workout_exercise_id = ? ORDER BY order_index',
      [workoutExerciseId]
    );
  }

  async findById(id: number): Promise<Block | null> {
    return this.db.getFirstAsync<Block>('SELECT * FROM blocks WHERE id = ?', [id]);
  }

  async save(dto: CreateBlockDto): Promise<Block> {
    const result = await this.db.runAsync(
      'INSERT INTO blocks (workout_exercise_id, name, order_index, is_work_block) VALUES (?, ?, ?, ?)',
      [dto.workout_exercise_id, dto.name, dto.order_index, dto.is_work_block]
    );
    const saved = await this.findById(result.lastInsertRowId);
    if (!saved) throw new Error(`Block ${result.lastInsertRowId} introuvable après insertion`);
    return saved;
  }

  async update(id: number, dto: UpdateBlockDto): Promise<Block> {
    const current = await this.findById(id);
    if (!current) throw new Error(`Block ${id} introuvable`);
    const merged = { ...current, ...dto };
    await this.db.runAsync(
      'UPDATE blocks SET name=?, is_work_block=? WHERE id=?',
      [merged.name, merged.is_work_block, id]
    );
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Block ${id} introuvable après update`);
    return updated;
  }

  async delete(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM blocks WHERE id = ?', [id]);
  }
}
