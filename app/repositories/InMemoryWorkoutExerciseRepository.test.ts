import { InMemoryWorkoutExerciseRepository } from './InMemoryWorkoutExerciseRepository';
import { runWorkoutExerciseRepositoryContractTests } from './workoutExerciseRepository.contract';

describe('InMemoryWorkoutExerciseRepository', () => {
  runWorkoutExerciseRepositoryContractTests(() => new InMemoryWorkoutExerciseRepository());
});

describe('InMemoryWorkoutExerciseRepository.updateSuperset', () => {
  it('assigne groupId non-null', async () => {
    const repo = new InMemoryWorkoutExerciseRepository();
    const saved = await repo.save({ workout_id: 1, exercise_id: 1, order_index: 0 });
    await repo.updateSuperset(saved.id, 42);
    const updated = await repo.findById(saved.id);
    expect(updated?.superset_group_id).toBe(42);
  });

  it('remet à null', async () => {
    const repo = new InMemoryWorkoutExerciseRepository();
    const saved = await repo.save({ workout_id: 1, exercise_id: 1, order_index: 0 });
    await repo.updateSuperset(saved.id, 42);
    await repo.updateSuperset(saved.id, null);
    const updated = await repo.findById(saved.id);
    expect(updated?.superset_group_id).toBeNull();
  });
});
