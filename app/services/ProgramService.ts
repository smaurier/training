import { Program } from '../db/types';
import { IProgramRepository, CreateProgramDto } from '../repositories/IProgramRepository';

export interface CreateProgramInput {
  name: string;
  description?: string | null;
}

export interface UpdateProgramInput {
  name: string;
  description?: string | null;
}

export class ProgramService {
  constructor(private readonly repo: IProgramRepository) {}

  async create(input: CreateProgramInput): Promise<Program> {
    if (!input.name.trim()) throw new Error('Le nom est requis');
    const existing = await this.repo.findAll();
    const hasActive = existing.some(p => p.is_active === 1);
    const dto: CreateProgramDto = {
      name: input.name.trim(),
      description: input.description ?? null,
      is_active: hasActive ? 0 : 1,
    };
    return this.repo.save(dto);
  }

  async update(id: number, input: UpdateProgramInput): Promise<Program> {
    if (!input.name.trim()) throw new Error('Le nom est requis');
    const current = await this.repo.findById(id);
    if (!current) throw new Error(`Programme ${id} introuvable`);
    return this.repo.update(id, {
      name: input.name.trim(),
      description: input.description ?? null,
      is_active: current.is_active,
    });
  }

  async setActive(id: number): Promise<void> {
    const target = await this.repo.findById(id);
    if (!target) throw new Error(`Programme ${id} introuvable`);
    const all = await this.repo.findAll();
    for (const p of all) {
      await this.repo.update(p.id, {
        name: p.name,
        description: p.description,
        is_active: p.id === id ? 1 : 0,
      });
    }
  }

  async listAll(): Promise<Program[]> {
    return this.repo.findAll();
  }

  async getById(id: number): Promise<Program | null> {
    return this.repo.findById(id);
  }

  async remove(id: number): Promise<void> {
    return this.repo.delete(id);
  }
}
