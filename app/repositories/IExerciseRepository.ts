import { Exercise, ExerciseType } from '../db/types';

export type CreateExerciseDto = Omit<Exercise, 'id' | 'created_at'>;

export interface IExerciseRepository {
  findAll(): Promise<Exercise[]>;
  findById(id: number): Promise<Exercise | null>;
  findByType(type: ExerciseType): Promise<Exercise[]>;
  save(data: CreateExerciseDto): Promise<Exercise>;
  delete(id: number): Promise<void>;
}
