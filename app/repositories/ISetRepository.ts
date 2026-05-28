import type { Set } from '../db/types';

export type CreateSetDto = Omit<Set, 'id'>;

export interface ISetRepository {
  findByBlockId(blockId: number): Promise<Set[]>;
  findById(id: number): Promise<Set | null>;
  save(dto: CreateSetDto): Promise<Set>;
  delete(id: number): Promise<void>;
}
