import type { Block } from '../db/types';
import { IBlockRepository, CreateBlockDto } from './IBlockRepository';

export class InMemoryBlockRepository implements IBlockRepository {
  private items: Block[] = [];
  private nextId = 1;

  async findByWorkoutExerciseId(workoutExerciseId: number): Promise<Block[]> {
    return this.items.filter(i => i.workout_exercise_id === workoutExerciseId);
  }

  async findById(id: number): Promise<Block | null> {
    return this.items.find(i => i.id === id) ?? null;
  }

  async save(dto: CreateBlockDto): Promise<Block> {
    const item: Block = { ...dto, id: this.nextId++ };
    this.items.push(item);
    return item;
  }

  async delete(id: number): Promise<void> {
    this.items = this.items.filter(i => i.id !== id);
  }
}
