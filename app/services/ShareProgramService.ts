import pako from 'pako';
import type { IProgramRepository } from '../repositories/IProgramRepository';
import type { IWorkoutRepository } from '../repositories/IWorkoutRepository';
import type { IWorkoutExerciseRepository } from '../repositories/IWorkoutExerciseRepository';
import type { IBlockRepository } from '../repositories/IBlockRepository';
import type { ISetRepository } from '../repositories/ISetRepository';
import type { IExerciseRepository } from '../repositories/IExerciseRepository';

export interface SharePayload {
  v: number;
  program: { name: string; description: string | null };
  workouts: ShareWorkout[];
}

interface ShareWorkout {
  name: string;
  order_index: number;
  exercises: ShareExercise[];
}

interface ShareExercise {
  name: string;
  type: string;
  muscle_groups: string;
  blocks: ShareBlock[];
}

interface ShareBlock {
  name: string;
  is_work_block: 0 | 1;
  order_index: number;
  sets: ShareSet[];
}

interface ShareSet {
  reps_min: number;
  weight: number | null;
  weight_type: string;
  rest_duration: number;
  order_index: number;
  duration_seconds: number | null;
  set_type: string;
}

export class ShareProgramService {
  constructor(
    private programRepo: IProgramRepository,
    private workoutRepo: IWorkoutRepository,
    private workoutExerciseRepo: IWorkoutExerciseRepository,
    private blockRepo: IBlockRepository,
    private setRepo: ISetRepository,
    private exerciseRepo: IExerciseRepository,
  ) {}

  compressPayload(json: string): string {
    const compressed = pako.deflate(json);
    // Convert Uint8Array to base64 safely, handling potential stack overflow
    // by processing in chunks if needed
    const binary = Array.from(compressed).map(b => String.fromCharCode(b)).join('');
    return btoa(binary);
  }

  decompressPayload(base64: string): string {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return pako.inflate(bytes, { to: 'string' });
  }

  async generatePayload(_programId: number): Promise<{ base64: string; sizeBytes: number }> {
    throw new Error('not implemented');
  }

  async importPayload(_base64: string): Promise<number> {
    throw new Error('not implemented');
  }
}
