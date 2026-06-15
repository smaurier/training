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

  async generatePayload(programId: number): Promise<{ base64: string; sizeBytes: number }> {
    const program = await this.programRepo.findById(programId);
    if (!program) throw new Error(`Programme ${programId} introuvable`);

    const workouts = await this.workoutRepo.findByProgramId(programId);

    const shareWorkouts: ShareWorkout[] = await Promise.all(
      workouts.map(async (w) => {
        const wes = await this.workoutExerciseRepo.findByWorkoutId(w.id);
        const exercises: ShareExercise[] = await Promise.all(
          wes.map(async (we) => {
            const exercise = await this.exerciseRepo.findById(we.exercise_id);
            const blocks = await this.blockRepo.findByWorkoutExerciseId(we.id);
            const shareBlocks: ShareBlock[] = await Promise.all(
              blocks.map(async (b) => {
                const sets = await this.setRepo.findByBlockId(b.id);
                return {
                  name: b.name,
                  is_work_block: b.is_work_block,
                  order_index: b.order_index,
                  sets: sets.map(s => ({
                    reps_min: s.reps_min,
                    weight: s.weight,
                    weight_type: s.weight_type,
                    rest_duration: s.rest_duration,
                    order_index: s.order_index,
                    duration_seconds: s.duration_seconds,
                    set_type: s.set_type,
                  })),
                };
              }),
            );
            return {
              name: exercise?.name ?? '',
              type: exercise?.type ?? 'musculation',
              muscle_groups: exercise?.muscle_groups ?? '[]',
              blocks: shareBlocks,
            };
          }),
        );
        return { name: w.name, order_index: w.order_index, exercises };
      }),
    );

    const payload: SharePayload = {
      v: 1,
      program: { name: program.name, description: program.description },
      workouts: shareWorkouts,
    };

    const json = JSON.stringify(payload);
    const base64 = this.compressPayload(json);
    return { base64, sizeBytes: base64.length };
  }

  async importPayload(_base64: string): Promise<number> {
    throw new Error('not implemented');
  }
}
