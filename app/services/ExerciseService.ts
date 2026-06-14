import { Exercise } from '../db/types';
import { IExerciseRepository, CreateExerciseDto } from '../repositories/IExerciseRepository';
import { ISetLogRepository } from '../repositories/ISetLogRepository';
import { IWorkoutExerciseRepository } from '../repositories/IWorkoutExerciseRepository';

export interface CreateExerciseInput {
  name: string;
  type: Exercise['type'];
  muscle_groups: string[];
  technical_notes?: string | null;
  is_custom?: 0 | 1;
  progression_step: number;
  progression_threshold: number;
}

export class SafeDeleteConflict extends Error {
  constructor(
    public readonly sessions: number,
    public readonly programs: number,
  ) {
    super('SAFE_DELETE_CONFLICT');
  }
}

export class ExerciseService {
  constructor(
    private readonly repo: IExerciseRepository,
    private readonly setLogRepo: ISetLogRepository,
    private readonly weRepo: IWorkoutExerciseRepository,
  ) {}

  async create(input: CreateExerciseInput): Promise<Exercise> {
    if (!input.name.trim()) {
      throw new Error('Le nom est requis');
    }
    if (input.progression_step <= 0) {
      throw new Error('Le pas de progression doit être positif');
    }

    const dto: CreateExerciseDto = {
      name: input.name.trim(),
      type: input.type,
      muscle_groups: JSON.stringify(input.muscle_groups),
      technical_notes: input.technical_notes ?? null,
      description: null,
      is_custom: input.is_custom ?? 0,
      progression_step: input.progression_step,
      progression_threshold: input.progression_threshold,
    };

    return this.repo.save(dto);
  }

  async listAll(): Promise<Exercise[]> {
    return this.repo.findAll();
  }

  async getById(id: number): Promise<Exercise | null> {
    return this.repo.findById(id);
  }

  async safeDelete(id: number, force = false): Promise<void> {
    if (!force) {
      const [logs, workoutExercises] = await Promise.all([
        this.setLogRepo.findByExerciseId(id),
        this.weRepo.findByExerciseId(id),
      ]);
      if (logs.length > 0 || workoutExercises.length > 0) {
        throw new SafeDeleteConflict(logs.length, workoutExercises.length);
      }
    }
    await this.repo.delete(id);
  }
}
