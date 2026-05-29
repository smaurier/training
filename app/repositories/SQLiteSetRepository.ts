import { SQLiteDatabase } from 'expo-sqlite';
import type { Set as TrainingSet } from '../db/types';
import { ISetRepository, CreateSetDto, UpdateSetDto } from './ISetRepository';

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

  async update(id: number, dto: UpdateSetDto): Promise<TrainingSet> {
    await this.db.runAsync(
      'UPDATE sets SET reps_min=?, reps_max=?, weight=?, weight_type=?, rest_duration=? WHERE id=?',
      [dto.reps_min, dto.reps_max, dto.weight, dto.weight_type, dto.rest_duration, id]
    );
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Set ${id} introuvable`);
    return updated;
  }

  async delete(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM sets WHERE id = ?', [id]);
  }

  async swap(idA: number, idB: number): Promise<void> {
    const a = await this.findById(idA);
    const b = await this.findById(idB);
    if (!a || !b) throw new Error(`swap: id inconnu (${idA}, ${idB})`);
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        'UPDATE sets SET order_index=? WHERE id=?',
        [b.order_index, idA]
      );
      await this.db.runAsync(
        'UPDATE sets SET order_index=? WHERE id=?',
        [a.order_index, idB]
      );
    });
  }
}
