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

  async importPayload(base64: string): Promise<number> {
    const json = this.decompressPayload(base64);
    const payload: SharePayload = JSON.parse(json);

    // Résoudre le nom (conflit)
    const existing = await this.programRepo.findAll();
    const names = new Set(existing.map(p => p.name));
    let programName = payload.program.name;
    if (names.has(programName)) {
      programName = `${payload.program.name} (importé)`;
      let counter = 2;
      while (names.has(programName)) {
        programName = `${payload.program.name} (importé-${counter++})`;
      }
    }

    const program = await this.programRepo.save({
      name: programName,
      description: payload.program.description,
      is_active: 0,
    });

    for (const sw of payload.workouts) {
      const workout = await this.workoutRepo.save({
        program_id: program.id,
        name: sw.name,
        order_index: sw.order_index,
      });

      for (let exIdx = 0; exIdx < sw.exercises.length; exIdx++) {
        const se = sw.exercises[exIdx];

        // Réutiliser exercice existant ou créer
        let exercise = await this.exerciseRepo.findByName(se.name);
        if (!exercise) {
          exercise = await this.exerciseRepo.save({
            name: se.name,
            type: se.type as any,
            muscle_groups: se.muscle_groups,
            technical_notes: null,
            description: null,
            is_custom: 0,
            progression_step: 2.5,
            progression_threshold: 1,
          });
        }

        const we = await this.workoutExerciseRepo.save({
          workout_id: workout.id,
          exercise_id: exercise.id,
          order_index: exIdx,
        });

        for (const sb of se.blocks) {
          const block = await this.blockRepo.save({
            workout_exercise_id: we.id,
            name: sb.name,
            order_index: sb.order_index,
            is_work_block: sb.is_work_block,
          });

          for (const ss of sb.sets) {
            await this.setRepo.save({
              block_id: block.id,
              reps_min: ss.reps_min,
              weight: ss.weight,
              weight_type: ss.weight_type as any,
              rest_duration: ss.rest_duration,
              order_index: ss.order_index,
              duration_seconds: ss.duration_seconds,
            });
          }
        }
      }
    }

    return program.id;
  }
}
