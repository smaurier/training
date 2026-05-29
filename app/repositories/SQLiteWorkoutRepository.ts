import { SQLiteDatabase } from 'expo-sqlite';
import { Workout } from '../db/types';
import { IWorkoutRepository, CreateWorkoutDto, UpdateWorkoutDto } from './IWorkoutRepository';

export class SQLiteWorkoutRepository implements IWorkoutRepository {
  constructor(private db: SQLiteDatabase) {}

  async findByProgramId(programId: number): Promise<Workout[]> {
    return this.db.getAllAsync<Workout>(
      'SELECT * FROM workouts WHERE program_id = ? ORDER BY order_index',
      [programId]
    );
  }

  async findById(id: number): Promise<Workout | null> {
    return this.db.getFirstAsync<Workout>(
      'SELECT * FROM workouts WHERE id = ?',
      [id]
    );
  }

  async save(dto: CreateWorkoutDto): Promise<Workout> {
    const result = await this.db.runAsync(
      `INSERT INTO workouts (program_id, name, order_index) VALUES (?, ?, ?)`,
      [dto.program_id, dto.name, dto.order_index]
    );
    const saved = await this.findById(result.lastInsertRowId);
    if (!saved) throw new Error(`Séance ${result.lastInsertRowId} introuvable après insertion`);
    return saved;
  }

  async update(id: number, dto: UpdateWorkoutDto): Promise<Workout> {
    const result = await this.db.runAsync(
      `UPDATE workouts SET name = ?, order_index = ? WHERE id = ?`,
      [dto.name, dto.order_index, id]
    );
    if (result.changes === 0) throw new Error(`Séance ${id} introuvable`);
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Séance ${id} introuvable après mise à jour`);
    return updated;
  }

  async delete(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM workouts WHERE id = ?', [id]);
  }

  async swap(idA: number, idB: number): Promise<void> {
    const a = await this.findById(idA);
    const b = await this.findById(idB);
    if (!a || !b) throw new Error(`swap: id inconnu (${idA}, ${idB})`);
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('UPDATE workouts SET order_index=? WHERE id=?', [b.order_index, idA]);
      await this.db.runAsync('UPDATE workouts SET order_index=? WHERE id=?', [a.order_index, idB]);
    });
  }
}
