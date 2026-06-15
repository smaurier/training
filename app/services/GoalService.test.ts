import { GoalService } from './GoalService';
import { InMemoryGoalRepository } from '../repositories/InMemoryGoalRepository';
import { InMemoryExerciseRepository } from '../repositories/InMemoryExerciseRepository';

function makeService() {
  const goalRepo = new InMemoryGoalRepository();
  const exerciseRepo = new InMemoryExerciseRepository();
  return { service: new GoalService(goalRepo, exerciseRepo), goalRepo, exerciseRepo };
}

describe('GoalService', () => {
  it('setGoal crée un objectif', async () => {
    const { service } = makeService();
    const goal = await service.setGoal(1, 100, null);
    expect(goal.exercise_id).toBe(1);
    expect(goal.target_weight).toBe(100);
    expect(goal.target_date).toBeNull();
    expect(goal.achieved_at).toBeNull();
  });

  it("setGoal remplace l'existant pour le même exercice", async () => {
    const { service } = makeService();
    await service.setGoal(1, 100, null);
    const updated = await service.setGoal(1, 120, '2026-09-01');
    expect(updated.target_weight).toBe(120);
    const fetched = await service.getGoal(1);
    expect(fetched?.target_weight).toBe(120);
  });

  it('markAchieved remplit achieved_at', async () => {
    const { service } = makeService();
    const goal = await service.setGoal(1, 100, null);
    await service.markAchieved(goal.id, '2026-08-15T10:00:00.000Z');
    const fetched = await service.getGoal(1);
    expect(fetched?.achieved_at).toBe('2026-08-15T10:00:00.000Z');
  });

  it("deleteGoal supprime l'objectif", async () => {
    const { service } = makeService();
    const goal = await service.setGoal(1, 100, null);
    await service.deleteGoal(goal.id);
    expect(await service.getGoal(1)).toBeNull();
  });
});
