import { Program } from '../db/types';
import { IProgramRepository, CreateProgramDto, UpdateProgramDto } from './IProgramRepository';

export class InMemoryProgramRepository implements IProgramRepository {
  private programs: Program[] = [];
  private nextId = 1;

  async findAll(): Promise<Program[]> {
    return [...this.programs];
  }

  async findById(id: number): Promise<Program | null> {
    return this.programs.find(p => p.id === id) ?? null;
  }

  async save(dto: CreateProgramDto): Promise<Program> {
    const program: Program = {
      ...dto,
      id: this.nextId++,
      created_at: new Date().toISOString(),
      template_id: dto.template_id ?? null,
    };
    this.programs.push(program);
    return program;
  }

  async update(id: number, dto: UpdateProgramDto): Promise<Program> {
    const index = this.programs.findIndex(p => p.id === id);
    if (index === -1) throw new Error(`Programme ${id} introuvable`);
    this.programs[index] = { ...this.programs[index], ...dto };
    return this.programs[index];
  }

  async delete(id: number): Promise<void> {
    this.programs = this.programs.filter(p => p.id !== id);
  }
}
