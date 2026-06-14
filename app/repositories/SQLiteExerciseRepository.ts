import { SQLiteDatabase } from 'expo-sqlite';
import { Exercise, ExerciseType } from '../db/types';
import { IExerciseRepository, CreateExerciseDto } from './IExerciseRepository';

export class SQLiteExerciseRepository implements IExerciseRepository {
  constructor(private db: SQLiteDatabase) {}

  async findAll(): Promise<Exercise[]> {
    return this.db.getAllAsync<Exercise>('SELECT * FROM exercises ORDER BY name');
  }

  async findById(id: number): Promise<Exercise | null> {
    return this.db.getFirstAsync<Exercise>(
      'SELECT * FROM exercises WHERE id = ?',
      [id]
    );
  }

  async findByType(type: ExerciseType): Promise<Exercise[]> {
    return this.db.getAllAsync<Exercise>(
      'SELECT * FROM exercises WHERE type = ? ORDER BY name',
      [type]
    );
  }

  async findByName(name: string): Promise<Exercise | null> {
    return this.db.getFirstAsync<Exercise>(
      'SELECT * FROM exercises WHERE name = ? COLLATE NOCASE',
      [name.trim()],
    );
  }

  async save(data: CreateExerciseDto): Promise<Exercise> {
    const result = await this.db.runAsync(
      `INSERT INTO exercises
         (name, type, muscle_groups, technical_notes, is_custom, progression_step, progression_threshold)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.type,
        data.muscle_groups,
        data.technical_notes,
        data.is_custom,
        data.progression_step,
        data.progression_threshold,
      ]
    );
    const saved = await this.findById(result.lastInsertRowId);
    if (!saved) throw new Error(`Exercise ${result.lastInsertRowId} not found after insert`);
    return saved;
  }

  async delete(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM exercises WHERE id = ?', [id]);
  }
}
