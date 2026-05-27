import { Program } from '../db/types';

export type CreateProgramDto = Omit<Program, 'id' | 'created_at'>;
export type UpdateProgramDto = Pick<Program, 'name' | 'description' | 'is_active'>;

export interface IProgramRepository {
  findAll(): Promise<Program[]>;
  findById(id: number): Promise<Program | null>;
  save(dto: CreateProgramDto): Promise<Program>;
  update(id: number, dto: UpdateProgramDto): Promise<Program>;
  delete(id: number): Promise<void>;
}
