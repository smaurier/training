import type { WorkoutExercise } from '../db/types';

export type CreateWorkoutExerciseDto = Omit<WorkoutExercise, 'id' | 'superset_group_id'>;

export interface IWorkoutExerciseRepository {
  findByWorkoutId(workoutId: number): Promise<WorkoutExercise[]>;
  findById(id: number): Promise<WorkoutExercise | null>;
  save(dto: CreateWorkoutExerciseDto): Promise<WorkoutExercise>;
  delete(id: number): Promise<void>;
  swap(idA: number, idB: number): Promise<void>;
  updateSuperset(id: number, groupId: number | null): Promise<void>;
}
