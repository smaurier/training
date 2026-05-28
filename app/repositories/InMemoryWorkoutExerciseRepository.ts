import type { WorkoutExercise } from '../db/types';
import { IWorkoutExerciseRepository, CreateWorkoutExerciseDto } from './IWorkoutExerciseRepository';

export class InMemoryWorkoutExerciseRepository implements IWorkoutExerciseRepository {
  private items: WorkoutExercise[] = [];
  private nextId = 1;

  async findByWorkoutId(workoutId: number): Promise<WorkoutExercise[]> {
    return this.items.filter(i => i.workout_id === workoutId);
  }

  async findById(id: number): Promise<WorkoutExercise | null> {
    return this.items.find(i => i.id === id) ?? null;
  }

  async save(dto: CreateWorkoutExerciseDto): Promise<WorkoutExercise> {
    const item: WorkoutExercise = { ...dto, id: this.nextId++ };
    this.items.push(item);
    return item;
  }

  async delete(id: number): Promise<void> {
    this.items = this.items.filter(i => i.id !== id);
  }
}
