import type { Block } from '../db/types';

export type CreateBlockDto = Omit<Block, 'id'>;

export interface IBlockRepository {
  findByWorkoutExerciseId(workoutExerciseId: number): Promise<Block[]>;
  findById(id: number): Promise<Block | null>;
  save(dto: CreateBlockDto): Promise<Block>;
  delete(id: number): Promise<void>;
}
