import type { WorkoutExercise } from '../db/types';

export type CreateWorkoutExerciseDto = Omit<WorkoutExercise, 'id'>;

export interface IWorkoutExerciseRepository {
  findByWorkoutId(workoutId: number): Promise<WorkoutExercise[]>;
  findById(id: number): Promise<WorkoutExercise | null>;
  save(dto: CreateWorkoutExerciseDto): Promise<WorkoutExercise>;
  delete(id: number): Promise<void>;
}
