import type { Set } from '../db/types';

export type CreateSetDto = Omit<Set, 'id' | 'duration_seconds' | 'weight_ratio'> & { duration_seconds?: number | null; weight_ratio?: number | null };
export type UpdateSetDto = Pick<Set, 'reps_min' | 'reps_max' | 'weight' | 'weight_type' | 'rest_duration'>;

export interface ISetRepository {
  findByBlockId(blockId: number): Promise<Set[]>;
  findById(id: number): Promise<Set | null>;
  save(dto: CreateSetDto): Promise<Set>;
  update(id: number, dto: UpdateSetDto): Promise<Set>;
  delete(id: number): Promise<void>;
  swap(idA: number, idB: number): Promise<void>;
}
