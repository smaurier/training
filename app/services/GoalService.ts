import type { IGoalRepository } from '../repositories/IGoalRepository';
import type { IExerciseRepository } from '../repositories/IExerciseRepository';
import type { Goal, GoalWithExercise } from '../db/types';

export class GoalService {
  constructor(
    private goalRepo: IGoalRepository,
    private exerciseRepo: IExerciseRepository,
  ) {}

  async setGoal(exerciseId: number, targetWeight: number, targetDate: string | null): Promise<Goal> {
    return this.goalRepo.save({ exercise_id: exerciseId, target_weight: targetWeight, target_date: targetDate });
  }

  async getGoal(exerciseId: number): Promise<Goal | null> {
    return this.goalRepo.findByExerciseId(exerciseId);
  }

  async getAllGoalsWithExercise(): Promise<GoalWithExercise[]> {
    const goals = await this.goalRepo.findAll();
    return Promise.all(goals.map(async goal => {
      const exercise = await this.exerciseRepo.findById(goal.exercise_id);
      return { goal, exerciseName: exercise?.name ?? '' };
    }));
  }

  async markAchieved(id: number, achievedAt: string): Promise<void> {
    return this.goalRepo.update(id, { achieved_at: achievedAt });
  }

  async deleteGoal(id: number): Promise<void> {
    return this.goalRepo.delete(id);
  }
}
