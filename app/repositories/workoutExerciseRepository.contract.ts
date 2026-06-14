import { IWorkoutExerciseRepository, CreateWorkoutExerciseDto } from './IWorkoutExerciseRepository';

const we1: CreateWorkoutExerciseDto = { workout_id: 1, exercise_id: 1, order_index: 0 };

export function runWorkoutExerciseRepositoryContractTests(
  createRepo: () => IWorkoutExerciseRepository
) {
  let repo: IWorkoutExerciseRepository;
  beforeEach(() => { repo = createRepo(); });

  describe('save', () => {
    it('retourne un workout_exercise avec un id généré', async () => {
      const result = await repo.save(we1);
      expect(result.id).toBeGreaterThan(0);
      expect(result.workout_id).toBe(1);
      expect(result.exercise_id).toBe(1);
    });
    it('assigne des ids distincts', async () => {
      const a = await repo.save(we1);
      const b = await repo.save({ ...we1, exercise_id: 2 });
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('findByWorkoutId', () => {
    it('retourne vide si aucun exercice', async () => {
      expect(await repo.findByWorkoutId(1)).toHaveLength(0);
    });
    it('retourne les exercices de la séance', async () => {
      await repo.save(we1);
      await repo.save({ ...we1, exercise_id: 2, order_index: 1 });
      expect(await repo.findByWorkoutId(1)).toHaveLength(2);
    });
    it("ne retourne pas les exercices d'une autre séance", async () => {
      await repo.save(we1);
      await repo.save({ ...we1, workout_id: 2 });
      expect(await repo.findByWorkoutId(1)).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('retourne le workout_exercise correspondant', async () => {
      const saved = await repo.save(we1);
      expect((await repo.findById(saved.id))?.exercise_id).toBe(1);
    });
    it('retourne null si id inconnu', async () => {
      expect(await repo.findById(999)).toBeNull();
    });
  });

  describe('delete', () => {
    it('supprime le workout_exercise', async () => {
      const saved = await repo.save(we1);
      await repo.delete(saved.id);
      expect(await repo.findById(saved.id)).toBeNull();
    });
    it('ne supprime que le workout_exercise ciblé', async () => {
      const a = await repo.save(we1);
      const b = await repo.save({ ...we1, exercise_id: 2, order_index: 1 });
      await repo.delete(a.id);
      const remaining = await repo.findByWorkoutId(1);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(b.id);
    });
  });

  describe('swap', () => {
    it('permute les order_index de deux workout_exercises', async () => {
      const a = await repo.save({ workout_id: 1, exercise_id: 1, order_index: 0 });
      const b = await repo.save({ workout_id: 1, exercise_id: 2, order_index: 1 });
      await repo.swap(a.id, b.id);
      expect((await repo.findById(a.id))!.order_index).toBe(1);
      expect((await repo.findById(b.id))!.order_index).toBe(0);
    });

    it('permute les order_index de deux items non-adjacents', async () => {
      const a = await repo.save({ workout_id: 1, exercise_id: 1, order_index: 0 });
      await repo.save({ workout_id: 1, exercise_id: 2, order_index: 1 });
      const c = await repo.save({ workout_id: 1, exercise_id: 3, order_index: 2 });
      await repo.swap(a.id, c.id);
      expect((await repo.findById(a.id))!.order_index).toBe(2);
      expect((await repo.findById(c.id))!.order_index).toBe(0);
    });

    it('throw si idB inconnu', async () => {
      const a = await repo.save({ workout_id: 1, exercise_id: 1, order_index: 0 });
      await expect(repo.swap(a.id, 999)).rejects.toThrow('999');
    });

    it('throw si idA inconnu', async () => {
      const a = await repo.save({ workout_id: 1, exercise_id: 1, order_index: 0 });
      await expect(repo.swap(999, a.id)).rejects.toThrow('999');
    });
  });

  describe('findByExerciseId', () => {
    it('retourne vide si aucun workout_exercise pour cet exercice', async () => {
      expect(await repo.findByExerciseId(99)).toHaveLength(0);
    });

    it('retourne les workout_exercises de cet exercice', async () => {
      await repo.save({ workout_id: 1, exercise_id: 7, order_index: 0 });
      await repo.save({ workout_id: 2, exercise_id: 7, order_index: 0 });
      await repo.save({ workout_id: 1, exercise_id: 8, order_index: 1 });
      const result = await repo.findByExerciseId(7);
      expect(result).toHaveLength(2);
      expect(result.every(we => we.exercise_id === 7)).toBe(true);
    });
  });
}
