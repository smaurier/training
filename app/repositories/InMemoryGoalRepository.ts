import type { IGoalRepository } from './IGoalRepository';
import type { Goal, CreateGoalDto } from '../db/types';

export class InMemoryGoalRepository implements IGoalRepository {
  private goals: Goal[] = [];
  private nextId = 1;

  async save(dto: CreateGoalDto): Promise<Goal> {
    const existing = this.goals.findIndex(g => g.exercise_id === dto.exercise_id);
    if (existing !== -1) this.goals.splice(existing, 1);
    const goal: Goal = {
      id: this.nextId++,
      exercise_id: dto.exercise_id,
      target_weight: dto.target_weight,
      target_date: dto.target_date,
      achieved_at: null,
      created_at: new Date().toISOString(),
    };
    this.goals.push(goal);
    return goal;
  }

  async findByExerciseId(exerciseId: number): Promise<Goal | null> {
    return this.goals.find(g => g.exercise_id === exerciseId) ?? null;
  }

  async findAll(): Promise<Goal[]> {
    return [...this.goals];
  }

  async update(id: number, patch: Partial<Pick<Goal, 'achieved_at' | 'target_weight' | 'target_date'>>): Promise<void> {
    const goal = this.goals.find(g => g.id === id);
    if (!goal) return;
    if (patch.achieved_at !== undefined) goal.achieved_at = patch.achieved_at;
    if (patch.target_weight !== undefined) goal.target_weight = patch.target_weight;
    if (patch.target_date !== undefined) goal.target_date = patch.target_date;
  }

  async delete(id: number): Promise<void> {
    this.goals = this.goals.filter(g => g.id !== id);
  }
}
