import { Exercise, ExerciseType } from '../db/types';
import { IExerciseRepository, CreateExerciseDto } from './IExerciseRepository';

export class InMemoryExerciseRepository implements IExerciseRepository {
  private exercises: Exercise[] = [];
  private nextId = 1;

  async findAll(): Promise<Exercise[]> {
    return [...this.exercises];
  }

  async findById(id: number): Promise<Exercise | null> {
    return this.exercises.find(e => e.id === id) ?? null;
  }

  async findByType(type: ExerciseType): Promise<Exercise[]> {
    return this.exercises.filter(e => e.type === type);
  }

  async findByName(name: string): Promise<Exercise | null> {
    return this.exercises.find(
      e => e.name.trim().toLowerCase() === name.trim().toLowerCase()
    ) ?? null;
  }

  async save(data: CreateExerciseDto): Promise<Exercise> {
    const exercise: Exercise = {
      ...data,
      id: this.nextId++,
      created_at: new Date().toISOString(),
    };
    this.exercises.push(exercise);
    return exercise;
  }

  async delete(id: number): Promise<void> {
    this.exercises = this.exercises.filter(e => e.id !== id);
  }
}
