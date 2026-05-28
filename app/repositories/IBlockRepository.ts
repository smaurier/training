import type { Block } from '../db/types';

export type CreateBlockDto = Omit<Block, 'id'>;
export type UpdateBlockDto = Partial<Pick<Block, 'name' | 'is_work_block'>>;

export interface IBlockRepository {
  findByWorkoutExerciseId(workoutExerciseId: number): Promise<Block[]>;
  findById(id: number): Promise<Block | null>;
  save(dto: CreateBlockDto): Promise<Block>;
  update(id: number, dto: UpdateBlockDto): Promise<Block>;
  delete(id: number): Promise<void>;
}
