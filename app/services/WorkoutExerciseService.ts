import type { WorkoutExercise, Exercise, Block, Set as TrainingSet } from '../db/types';
import { IWorkoutExerciseRepository } from '../repositories/IWorkoutExerciseRepository';
import { IBlockRepository, UpdateBlockDto } from '../repositories/IBlockRepository';
import { ISetRepository, UpdateSetDto } from '../repositories/ISetRepository';
import { IExerciseRepository } from '../repositories/IExerciseRepository';

export type TransactionRunner = (fn: () => Promise<void>) => Promise<void>;

export interface BlockWithSets {
  id: number;
  name: string;
  order_index: number;
  is_work_block: 0 | 1;
  sets: TrainingSet[];
}

export interface WorkoutExerciseDetail {
  id: number;
  workout_id: number;
  order_index: number;
  superset_group_id: number | null;
  exercise: Pick<Exercise, 'id' | 'name' | 'type' | 'technical_notes' | 'muscle_groups' | 'description'>;
  blocks: BlockWithSets[];
}

export class WorkoutExerciseService {
  constructor(
    private weRepo: IWorkoutExerciseRepository,
    private blockRepo: IBlockRepository,
    private setRepo: ISetRepository,
    private exerciseRepo: IExerciseRepository,
    private runInTransaction: TransactionRunner
  ) {}

  async addToWorkout(workoutId: number, exerciseId: number): Promise<WorkoutExerciseDetail> {
    const exercise = await this.exerciseRepo.findById(exerciseId);
    if (!exercise) throw new Error(`Exercice ${exerciseId} introuvable`);

    const existing = await this.weRepo.findByWorkoutId(workoutId);
    const orderIndex = existing.length;

    let savedWe!: WorkoutExercise;

    await this.runInTransaction(async () => {
      savedWe = await this.weRepo.save({ workout_id: workoutId, exercise_id: exerciseId, order_index: orderIndex });
      const block = await this.blockRepo.save({
        workout_exercise_id: savedWe.id,
        name: 'Travail',
        order_index: 0,
        is_work_block: 1,
      });
      await this.setRepo.save({
        block_id: block.id,
        reps_min: 3,
        weight: null,
        weight_type: 'fixed',
        rest_duration: 120,
        order_index: 0,
      });
    });

    return this.loadDetail(savedWe, exercise);
  }

  async getWithDetails(workoutId: number): Promise<WorkoutExerciseDetail[]> {
    const wes = await this.weRepo.findByWorkoutId(workoutId);
    return Promise.all(wes.map(async (we) => {
      const exercise = await this.exerciseRepo.findById(we.exercise_id);
      if (!exercise) throw new Error(`Exercice ${we.exercise_id} introuvable`);
      return this.loadDetail(we, exercise);
    }));
  }

  async remove(id: number): Promise<void> {
    await this.weRepo.delete(id);
  }

  async updateSet(setId: number, dto: UpdateSetDto): Promise<void> {
    await this.setRepo.update(setId, dto);
  }

  async addSet(blockId: number): Promise<void> {
    const existing = await this.setRepo.findByBlockId(blockId);
    await this.setRepo.save({
      block_id: blockId,
      reps_min: 3,
      weight: null,
      weight_type: 'fixed',
      rest_duration: 120,
      order_index: existing.length,
    });
  }

  async removeSet(setId: number): Promise<void> {
    await this.setRepo.delete(setId);
  }

  async addBlock(workoutExerciseId: number, name: string, isWorkBlock: 0 | 1): Promise<void> {
    await this.runInTransaction(async () => {
      const existing = await this.blockRepo.findByWorkoutExerciseId(workoutExerciseId);
      const block = await this.blockRepo.save({
        workout_exercise_id: workoutExerciseId,
        name,
        order_index: existing.length,
        is_work_block: isWorkBlock,
      });
      await this.setRepo.save({
        block_id: block.id,
        reps_min: 3,
        weight: null,
        weight_type: 'fixed',
        rest_duration: 120,
        order_index: 0,
      });
    });
  }

  async updateBlock(blockId: number, dto: UpdateBlockDto): Promise<void> {
    await this.blockRepo.update(blockId, dto);
  }

  async removeBlock(blockId: number): Promise<void> {
    await this.blockRepo.delete(blockId);
  }

  async reorderExercise(workoutId: number, exerciseId: number, direction: 'up' | 'down'): Promise<void> {
    const siblings = (await this.weRepo.findByWorkoutId(workoutId))
      .sort((a, b) => a.order_index - b.order_index);
    const idx = siblings.findIndex(e => e.id === exerciseId);
    if (idx === -1) return;
    const neighborIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (neighborIdx < 0 || neighborIdx >= siblings.length) return;
    await this.weRepo.swap(siblings[idx].id, siblings[neighborIdx].id);
  }

  async reorderBlock(workoutExerciseId: number, blockId: number, direction: 'up' | 'down'): Promise<void> {
    const siblings = (await this.blockRepo.findByWorkoutExerciseId(workoutExerciseId))
      .sort((a, b) => a.order_index - b.order_index);
    const idx = siblings.findIndex(b => b.id === blockId);
    if (idx === -1) return;
    const neighborIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (neighborIdx < 0 || neighborIdx >= siblings.length) return;
    await this.blockRepo.swap(siblings[idx].id, siblings[neighborIdx].id);
  }

  async reorderSet(blockId: number, setId: number, direction: 'up' | 'down'): Promise<void> {
    const siblings = (await this.setRepo.findByBlockId(blockId))
      .sort((a, b) => a.order_index - b.order_index);
    const idx = siblings.findIndex(s => s.id === setId);
    if (idx === -1) return;
    const neighborIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (neighborIdx < 0 || neighborIdx >= siblings.length) return;
    await this.setRepo.swap(siblings[idx].id, siblings[neighborIdx].id);
  }

  private async loadDetail(we: WorkoutExercise, exercise: Exercise): Promise<WorkoutExerciseDetail> {
    const blocks = await this.blockRepo.findByWorkoutExerciseId(we.id);
    const blocksWithSets: BlockWithSets[] = await Promise.all(
      blocks.map(async (block: Block) => ({
        ...block,
        sets: await this.setRepo.findByBlockId(block.id),
      }))
    );
    return {
      id: we.id,
      workout_id: we.workout_id,
      order_index: we.order_index,
      superset_group_id: we.superset_group_id,
      exercise: {
        id: exercise.id,
        name: exercise.name,
        type: exercise.type,
        technical_notes: exercise.technical_notes,
        muscle_groups: exercise.muscle_groups,
        description: exercise.description,
      },
      blocks: blocksWithSets,
    };
  }
}
