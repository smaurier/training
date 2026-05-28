import { SQLiteDatabase } from 'expo-sqlite';
import type { WorkoutExercise } from '../db/types';
import { IWorkoutExerciseRepository, CreateWorkoutExerciseDto } from './IWorkoutExerciseRepository';

export class SQLiteWorkoutExerciseRepository implements IWorkoutExerciseRepository {
  constructor(private db: SQLiteDatabase) {}

  async findByWorkoutId(workoutId: number): Promise<WorkoutExercise[]> {
    return this.db.getAllAsync<WorkoutExercise>(
      'SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY order_index',
      [workoutId]
    );
  }

  async findById(id: number): Promise<WorkoutExercise | null> {
    return this.db.getFirstAsync<WorkoutExercise>(
      'SELECT * FROM workout_exercises WHERE id = ?',
      [id]
    );
  }

  async save(dto: CreateWorkoutExerciseDto): Promise<WorkoutExercise> {
    const result = await this.db.runAsync(
      'INSERT INTO workout_exercises (workout_id, exercise_id, order_index) VALUES (?, ?, ?)',
      [dto.workout_id, dto.exercise_id, dto.order_index]
    );
    const saved = await this.findById(result.lastInsertRowId);
    if (!saved) throw new Error(`WorkoutExercise ${result.lastInsertRowId} introuvable après insertion`);
    return saved;
  }

  async delete(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM workout_exercises WHERE id = ?', [id]);
  }
}
