import { Workout } from '../db/types';
import { IWorkoutRepository, CreateWorkoutDto, UpdateWorkoutDto } from './IWorkoutRepository';

export class InMemoryWorkoutRepository implements IWorkoutRepository {
  private workouts: Workout[] = [];
  private nextId = 1;

  async findByProgramId(programId: number): Promise<Workout[]> {
    return this.workouts.filter(w => w.program_id === programId);
  }

  async findById(id: number): Promise<Workout | null> {
    return this.workouts.find(w => w.id === id) ?? null;
  }

  async save(dto: CreateWorkoutDto): Promise<Workout> {
    const workout: Workout = { ...dto, id: this.nextId++ };
    this.workouts.push(workout);
    return workout;
  }

  async update(id: number, dto: UpdateWorkoutDto): Promise<Workout> {
    const index = this.workouts.findIndex(w => w.id === id);
    if (index === -1) throw new Error(`Séance ${id} introuvable`);
    this.workouts[index] = { ...this.workouts[index], ...dto };
    return this.workouts[index];
  }

  async delete(id: number): Promise<void> {
    this.workouts = this.workouts.filter(w => w.id !== id);
  }

  async swap(idA: number, idB: number): Promise<void> {
    const a = this.workouts.find(w => w.id === idA);
    const b = this.workouts.find(w => w.id === idB);
    if (!a || !b) throw new Error(`swap: id inconnu (${idA}, ${idB})`);
    const tmp = a.order_index;
    a.order_index = b.order_index;
    b.order_index = tmp;
  }
}
