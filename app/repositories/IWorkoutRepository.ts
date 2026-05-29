import { Workout } from '../db/types';

export type CreateWorkoutDto = Omit<Workout, 'id'>;
export type UpdateWorkoutDto = Pick<Workout, 'name' | 'order_index'>;

export interface IWorkoutRepository {
  findByProgramId(programId: number): Promise<Workout[]>;
  findById(id: number): Promise<Workout | null>;
  save(dto: CreateWorkoutDto): Promise<Workout>;
  update(id: number, dto: UpdateWorkoutDto): Promise<Workout>;
  delete(id: number): Promise<void>;
  swap(idA: number, idB: number): Promise<void>;
}
