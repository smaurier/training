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
    const item: WorkoutExercise = { ...dto, id: this.nextId++, superset_group_id: null };
    this.items.push(item);
    return item;
  }

  async delete(id: number): Promise<void> {
    this.items = this.items.filter(i => i.id !== id);
  }

  async swap(idA: number, idB: number): Promise<void> {
    const a = this.items.find(i => i.id === idA);
    const b = this.items.find(i => i.id === idB);
    if (!a || !b) throw new Error(`swap: id inconnu (${idA}, ${idB})`);
    const tmp = a.order_index;
    a.order_index = b.order_index;
    b.order_index = tmp;
  }

  async updateSuperset(id: number, groupId: number | null): Promise<void> {
    const item = this.items.find(i => i.id === id);
    if (item) item.superset_group_id = groupId;
  }
}
