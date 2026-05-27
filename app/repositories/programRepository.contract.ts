import { IProgramRepository, CreateProgramDto } from './IProgramRepository';

const push: CreateProgramDto = {
  name: 'Push',
  description: 'Pectoraux, épaules, triceps',
  is_active: 0,
};

export function runProgramRepositoryContractTests(
  createRepo: () => IProgramRepository
) {
  let repo: IProgramRepository;

  beforeEach(() => {
    repo = createRepo();
  });

  describe('save', () => {
    it('retourne un programme avec un id généré', async () => {
      const result = await repo.save(push);
      expect(result.id).toBeGreaterThan(0);
      expect(result.name).toBe('Push');
    });

    it('assigne des ids distincts', async () => {
      const a = await repo.save(push);
      const b = await repo.save({ ...push, name: 'Pull' });
      expect(a.id).not.toBe(b.id);
    });

    it('horodate created_at', async () => {
      const result = await repo.save(push);
      expect(result.created_at).toBeTruthy();
    });
  });

  describe('findAll', () => {
    it('retourne vide quand aucun programme', async () => {
      expect(await repo.findAll()).toHaveLength(0);
    });

    it('retourne tous les programmes sauvegardés', async () => {
      await repo.save(push);
      await repo.save({ ...push, name: 'Pull' });
      expect(await repo.findAll()).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('retourne le programme correspondant', async () => {
      const saved = await repo.save(push);
      const found = await repo.findById(saved.id);
      expect(found?.name).toBe('Push');
    });

    it('retourne null si id inconnu', async () => {
      expect(await repo.findById(999)).toBeNull();
    });
  });

  describe('update', () => {
    it('met à jour les champs', async () => {
      const saved = await repo.save(push);
      const updated = await repo.update(saved.id, {
        name: 'Push B',
        description: 'Version B',
        is_active: 1,
      });
      expect(updated.name).toBe('Push B');
      expect(updated.is_active).toBe(1);
    });

    it('lève une erreur si id inconnu', async () => {
      await expect(
        repo.update(999, { name: 'X', description: null, is_active: 0 })
      ).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('supprime le programme', async () => {
      const saved = await repo.save(push);
      await repo.delete(saved.id);
      expect(await repo.findById(saved.id)).toBeNull();
    });

    it('ne supprime que le programme ciblé', async () => {
      const a = await repo.save(push);
      const b = await repo.save({ ...push, name: 'Pull' });
      await repo.delete(a.id);
      const remaining = await repo.findAll();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(b.id);
    });
  });
}
