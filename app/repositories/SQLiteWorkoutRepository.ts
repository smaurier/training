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
}
