import type { Goal, CreateGoalDto } from '../db/types';

export interface IGoalRepository {
  save(dto: CreateGoalDto): Promise<Goal>;
  findByExerciseId(exerciseId: number): Promise<Goal | null>;
  findAll(): Promise<Goal[]>;
  update(id: number, patch: Partial<Pick<Goal, 'achieved_at' | 'target_weight' | 'target_date'>>): Promise<void>;
  delete(id: number): Promise<void>;
}
