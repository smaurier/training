import { SQLiteDatabase } from 'expo-sqlite';
import type { Set as TrainingSet } from '../db/types';
import { ISetRepository, CreateSetDto } from './ISetRepository';

export class SQLiteSetRepository implements ISetRepository {
  constructor(private db: SQLiteDatabase) {}

  async findByBlockId(blockId: number): Promise<TrainingSet[]> {
    return this.db.getAllAsync<TrainingSet>(
      'SELECT * FROM sets WHERE block_id = ? ORDER BY order_index',
      [blockId]
    );
  }

  async findById(id: number): Promise<TrainingSet | null> {
    return this.db.getFirstAsync<TrainingSet>('SELECT * FROM sets WHERE id = ?', [id]);
  }

  async save(dto: CreateSetDto): Promise<TrainingSet> {
    const result = await this.db.runAsync(
      'INSERT INTO sets (block_id, reps_min, reps_max, weight, weight_type, rest_duration, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [dto.block_id, dto.reps_min, dto.reps_max, dto.weight, dto.weight_type, dto.rest_duration, dto.order_index]
    );
    const saved = await this.findById(result.lastInsertRowId);
    if (!saved) throw new Error(`Set ${result.lastInsertRowId} introuvable après insertion`);
    return saved;
  }

  async delete(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM sets WHERE id = ?', [id]);
  }
}
