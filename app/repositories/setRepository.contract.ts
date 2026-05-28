import { ISetRepository, CreateSetDto, UpdateSetDto } from './ISetRepository';

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

  describe('update', () => {
    it('modifie les champs fournis et retourne la série mise à jour', async () => {
      const saved = await repo.save(serie1);
      const dto: UpdateSetDto = {
        reps_min: 4,
        reps_max: 6,
        weight: 80,
        weight_type: 'fixed',
        rest_duration: 90,
      };
      const updated = await repo.update(saved.id, dto);
      expect(updated.reps_min).toBe(4);
      expect(updated.reps_max).toBe(6);
      expect(updated.weight).toBe(80);
      expect(updated.rest_duration).toBe(90);
      expect(updated.weight_type).toBe('fixed');
      expect(updated.id).toBe(saved.id);
    });

    it('ne modifie pas les autres champs (block_id, order_index)', async () => {
      const saved = await repo.save(serie1);
      const dto: UpdateSetDto = {
        reps_min: 4,
        reps_max: 6,
        weight: null,
        weight_type: 'bodyweight',
        rest_duration: 60,
      };
      const updated = await repo.update(saved.id, dto);
      expect(updated.block_id).toBe(serie1.block_id);
      expect(updated.order_index).toBe(serie1.order_index);
      expect(updated.weight).toBeNull();
      expect(updated.weight_type).toBe('bodyweight');
    });

    it('throw si id inconnu', async () => {
      const dto: UpdateSetDto = {
        reps_min: 4,
        reps_max: 6,
        weight: null,
        weight_type: 'fixed',
        rest_duration: 60,
      };
      await expect(repo.update(999, dto)).rejects.toThrow('999');
    });
  });

  describe('swap', () => {
    it('permute les order_index de deux séries', async () => {
      const a = await repo.save({ ...serie1, order_index: 0 });
      const b = await repo.save({ ...serie1, order_index: 1 });
      await repo.swap(a.id, b.id);
      expect((await repo.findById(a.id))!.order_index).toBe(1);
      expect((await repo.findById(b.id))!.order_index).toBe(0);
    });

    it('permute les order_index de deux séries non-adjacentes', async () => {
      const a = await repo.save({ ...serie1, order_index: 0 });
      await repo.save({ ...serie1, order_index: 1 });
      const c = await repo.save({ ...serie1, order_index: 2 });
      await repo.swap(a.id, c.id);
      expect((await repo.findById(a.id))!.order_index).toBe(2);
      expect((await repo.findById(c.id))!.order_index).toBe(0);
    });

    it('throw si idB inconnu', async () => {
      const a = await repo.save({ ...serie1, order_index: 0 });
      await expect(repo.swap(a.id, 999)).rejects.toThrow('999');
    });

    it('throw si idA inconnu', async () => {
      const a = await repo.save({ ...serie1, order_index: 0 });
      await expect(repo.swap(999, a.id)).rejects.toThrow('999');
    });
  });
}
