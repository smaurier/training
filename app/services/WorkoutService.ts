import { Workout } from '../db/types';
import { IWorkoutRepository, CreateWorkoutDto } from '../repositories/IWorkoutRepository';

export interface CreateWorkoutInput {
  name: string;
  programId: number;
}

export interface UpdateWorkoutInput {
  name: string;
}

export class WorkoutService {
  constructor(private readonly repo: IWorkoutRepository) {}

  async create(input: CreateWorkoutInput): Promise<Workout> {
    if (!input.name.trim()) throw new Error('Le nom est requis');
    const existing = await this.repo.findByProgramId(input.programId);
    const dto: CreateWorkoutDto = {
      program_id: input.programId,
      name: input.name.trim(),
      order_index: existing.length,
    };
    return this.repo.save(dto);
  }

  async update(id: number, input: UpdateWorkoutInput): Promise<Workout> {
    if (!input.name.trim()) throw new Error('Le nom est requis');
    const current = await this.repo.findById(id);
    if (!current) throw new Error(`Séance ${id} introuvable`);
    return this.repo.update(id, {
      name: input.name.trim(),
      order_index: current.order_index,
    });
  }

  async listByProgram(programId: number): Promise<Workout[]> {
    return this.repo.findByProgramId(programId);
  }

  async getById(id: number): Promise<Workout | null> {
    return this.repo.findById(id);
  }

  async remove(id: number): Promise<void> {
    return this.repo.delete(id);
  }

  async reorder(programId: number, workoutId: number, direction: 'up' | 'down'): Promise<void> {
    const siblings = (await this.repo.findByProgramId(programId))
      .sort((a, b) => a.order_index - b.order_index);
    const idx = siblings.findIndex(w => w.id === workoutId);
    if (idx === -1) return;
    const neighborIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (neighborIdx < 0 || neighborIdx >= siblings.length) return;
    await this.repo.swap(siblings[idx].id, siblings[neighborIdx].id);
  }
}
