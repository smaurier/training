import { ISetRepository, CreateSetDto } from './ISetRepository';

const serie1: CreateSetDto = {
  block_id: 1,
  reps_min: 6,
  reps_max: 8,
  weight: null,
  weight_type: 'fixed',
  rest_duration: 120,
  order_index: 0,
};

export function runSetRepositoryContractTests(createRepo: () => ISetRepository) {
  let repo: ISetRepository;
  beforeEach(() => { repo = createRepo(); });

  describe('save', () => {
    it('retourne une série avec un id généré', async () => {
      const result = await repo.save(serie1);
      expect(result.id).toBeGreaterThan(0);
      expect(result.reps_min).toBe(6);
      expect(result.reps_max).toBe(8);
    });
    it('assigne des ids distincts', async () => {
      const a = await repo.save(serie1);
      const b = await repo.save({ ...serie1, order_index: 1 });
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('findByBlockId', () => {
    it('retourne vide si aucune série', async () => {
      expect(await repo.findByBlockId(1)).toHaveLength(0);
    });
    it('retourne les séries du bloc', async () => {
      await repo.save(serie1);
      await repo.save({ ...serie1, order_index: 1 });
      expect(await repo.findByBlockId(1)).toHaveLength(2);
    });
    it("ne retourne pas les séries d'un autre bloc", async () => {
      await repo.save(serie1);
      await repo.save({ ...serie1, block_id: 2 });
      expect(await repo.findByBlockId(1)).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('retourne la série correspondante', async () => {
      const saved = await repo.save(serie1);
      expect((await repo.findById(saved.id))?.reps_max).toBe(8);
    });
    it('retourne null si id inconnu', async () => {
      expect(await repo.findById(999)).toBeNull();
    });
  });

  describe('delete', () => {
    it('supprime la série', async () => {
      const saved = await repo.save(serie1);
      await repo.delete(saved.id);
      expect(await repo.findById(saved.id)).toBeNull();
    });
    it('ne supprime que la série ciblée', async () => {
      const a = await repo.save(serie1);
      const b = await repo.save({ ...serie1, order_index: 1 });
      await repo.delete(a.id);
      const remaining = await repo.findByBlockId(1);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(b.id);
    });
  });
}
