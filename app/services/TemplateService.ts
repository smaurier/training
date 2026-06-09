import type { TemplateDefinition } from '../data/templates';
import type { Program } from '../db/types';
import type { IProgramRepository } from '../repositories/IProgramRepository';
import type { IWorkoutRepository } from '../repositories/IWorkoutRepository';
import type { IWorkoutExerciseRepository } from '../repositories/IWorkoutExerciseRepository';
import type { IBlockRepository } from '../repositories/IBlockRepository';
import type { ISetRepository } from '../repositories/ISetRepository';
import type { IExerciseRepository } from '../repositories/IExerciseRepository';

export function isTemplateImported(programs: Program[], templateId: string): boolean {
  return programs.some(p => p.template_id === templateId);
}

export async function importTemplate(
  template: TemplateDefinition,
  programName: string,
  programRepo: IProgramRepository,
  workoutRepo: IWorkoutRepository,
  workoutExerciseRepo: IWorkoutExerciseRepository,
  blockRepo: IBlockRepository,
  setRepo: ISetRepository,
  exerciseRepo: IExerciseRepository,
): Promise<number> {
  const exercises = await exerciseRepo.findAll();
  const exerciseMap = new Map(exercises.map(e => [e.name, e.id]));

  for (const workout of template.workouts) {
    for (const ex of workout.exercises) {
      if (!exerciseMap.has(ex.exerciseName)) {
        throw new Error(`Exercice introuvable: "${ex.exerciseName}"`);
      }
    }
  }

  const program = await programRepo.save({
    name: programName,
    description: null,
    is_active: 0,
    template_id: template.id,
  });

  for (let wi = 0; wi < template.workouts.length; wi++) {
    const wt = template.workouts[wi];
    const workout = await workoutRepo.save({ program_id: program.id, name: wt.name, order_index: wi });

    for (let ei = 0; ei < wt.exercises.length; ei++) {
      const et = wt.exercises[ei];
      const exerciseId = exerciseMap.get(et.exerciseName)!;
      const we = await workoutExerciseRepo.save({ workout_id: workout.id, exercise_id: exerciseId, order_index: ei });

      for (let bi = 0; bi < et.blocks.length; bi++) {
        const bt = et.blocks[bi];
        const block = await blockRepo.save({
          workout_exercise_id: we.id,
          name: bt.name,
          order_index: bi,
          is_work_block: bt.is_work ? 1 : 0,
        });

        for (let si = 0; si < bt.sets.length; si++) {
          const st = bt.sets[si];
          await setRepo.save({
            block_id: block.id,
            reps_min: st.reps_min,
            reps_max: st.reps_max,
            weight: st.weight,
            weight_type: st.weight_type,
            rest_duration: st.rest,
            order_index: si,
            duration_seconds: st.duration_seconds ?? null,
            weight_ratio: st.weight_ratio ?? null,
          });
        }
      }
    }
  }

  return program.id;
}
