import type { Set, SetType } from '../db/types';

export type CreateSetDto = Omit<Set, 'id' | 'duration_seconds' | 'weight_ratio' | 'set_type'>
  & { duration_seconds?: number | null; weight_ratio?: number | null };

export type UpdateSetDto = Pick<Set, 'reps_min' | 'weight' | 'weight_type' | 'rest_duration'>
  & { set_type?: SetType };

export interface ISetRepository {
  findByBlockId(blockId: number): Promise<Set[]>;
  findById(id: number): Promise<Set | null>;
  save(dto: CreateSetDto): Promise<Set>;
  update(id: number, dto: UpdateSetDto): Promise<Set>;
  delete(id: number): Promise<void>;
  swap(idA: number, idB: number): Promise<void>;
}
