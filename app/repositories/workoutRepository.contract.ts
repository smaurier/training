import { IWorkoutRepository, CreateWorkoutDto } from './IWorkoutRepository';

const pushA: CreateWorkoutDto = {
  program_id: 1,
  name: 'Push A',
  order_index: 0,
};

export function runWorkoutRepositoryContractTests(
  createRepo: () => IWorkoutRepository
) {
  let repo: IWorkoutRepository;

  beforeEach(() => {
    repo = createRepo();
  });

  describe('save', () => {
    it('retourne une séance avec un id généré', async () => {
      const result = await repo.save(pushA);
      expect(result.id).toBeGreaterThan(0);
      expect(result.name).toBe('Push A');
    });

    it('assigne des ids distincts', async () => {
      const a = await repo.save(pushA);
      const b = await repo.save({ ...pushA, name: 'Push B' });
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('findByProgramId', () => {
    it('retourne vide si aucune séance', async () => {
      expect(await repo.findByProgramId(1)).toHaveLength(0);
    });

    it('retourne les séances du programme', async () => {
      await repo.save(pushA);
      await repo.save({ ...pushA, name: 'Pull A' });
      expect(await repo.findByProgramId(1)).toHaveLength(2);
    });

    it("ne retourne pas les séances d'un autre programme", async () => {
      await repo.save(pushA);
      await repo.save({ ...pushA, program_id: 2, name: 'Legs' });
      expect(await repo.findByProgramId(1)).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('retourne la séance correspondante', async () => {
      const saved = await repo.save(pushA);
      const found = await repo.findById(saved.id);
      expect(found?.name).toBe('Push A');
    });

    it('retourne null si id inconnu', async () => {
      expect(await repo.findById(999)).toBeNull();
    });
  });

  describe('update', () => {
    it('met à jour le nom', async () => {
      const saved = await repo.save(pushA);
      const updated = await repo.update(saved.id, { name: 'Push A v2', order_index: 1 });
      expect(updated.name).toBe('Push A v2');
    });

    it('lève une erreur si id inconnu', async () => {
      await expect(
        repo.update(999, { name: 'X', order_index: 0 })
      ).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('supprime la séance', async () => {
      const saved = await repo.save(pushA);
      await repo.delete(saved.id);
      expect(await repo.findById(saved.id)).toBeNull();
    });

    it('ne supprime que la séance ciblée', async () => {
      const a = await repo.save(pushA);
      const b = await repo.save({ ...pushA, name: 'Pull A' });
      await repo.delete(a.id);
      const remaining = await repo.findByProgramId(1);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(b.id);
    });
  });
}
