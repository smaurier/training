import { IBlockRepository, CreateBlockDto } from './IBlockRepository';

const bloc1: CreateBlockDto = { workout_exercise_id: 1, name: 'Travail', order_index: 0, is_work_block: 1 };

export function runBlockRepositoryContractTests(createRepo: () => IBlockRepository) {
  let repo: IBlockRepository;
  beforeEach(() => { repo = createRepo(); });

  describe('save', () => {
    it('retourne un block avec un id généré', async () => {
      const result = await repo.save(bloc1);
      expect(result.id).toBeGreaterThan(0);
      expect(result.name).toBe('Travail');
    });
    it('assigne des ids distincts', async () => {
      const a = await repo.save(bloc1);
      const b = await repo.save({ ...bloc1, name: 'Échauffement', order_index: 1 });
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('findByWorkoutExerciseId', () => {
    it('retourne vide si aucun bloc', async () => {
      expect(await repo.findByWorkoutExerciseId(1)).toHaveLength(0);
    });
    it('retourne les blocs du workout_exercise', async () => {
      await repo.save(bloc1);
      await repo.save({ ...bloc1, name: 'Back-off', order_index: 1 });
      expect(await repo.findByWorkoutExerciseId(1)).toHaveLength(2);
    });
    it("ne retourne pas les blocs d'un autre workout_exercise", async () => {
      await repo.save(bloc1);
      await repo.save({ ...bloc1, workout_exercise_id: 2 });
      expect(await repo.findByWorkoutExerciseId(1)).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('retourne le bloc correspondant', async () => {
      const saved = await repo.save(bloc1);
      expect((await repo.findById(saved.id))?.name).toBe('Travail');
    });
    it('retourne null si id inconnu', async () => {
      expect(await repo.findById(999)).toBeNull();
    });
  });

  describe('delete', () => {
    it('supprime le bloc', async () => {
      const saved = await repo.save(bloc1);
      await repo.delete(saved.id);
      expect(await repo.findById(saved.id)).toBeNull();
    });
    it('ne supprime que le bloc ciblé', async () => {
      const a = await repo.save(bloc1);
      const b = await repo.save({ ...bloc1, name: 'Back-off', order_index: 1 });
      await repo.delete(a.id);
      const remaining = await repo.findByWorkoutExerciseId(1);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(b.id);
    });
  });
}
