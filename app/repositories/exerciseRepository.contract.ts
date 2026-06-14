import { IExerciseRepository, CreateExerciseDto } from './IExerciseRepository';

const squat: CreateExerciseDto = {
  name: 'Squat',
  type: 'musculation',
  muscle_groups: '["quadriceps","fessiers"]',
  technical_notes: null,
  description: null,
  is_custom: 0,
  progression_step: 2.5,
  progression_threshold: 1,
};

export function runExerciseRepositoryContractTests(
  createRepo: () => IExerciseRepository
) {
  let repo: IExerciseRepository;

  beforeEach(() => {
    repo = createRepo();
  });

  describe('save', () => {
    it('retourne un exercice avec un id généré', async () => {
      const result = await repo.save(squat);
      expect(result.id).toBeGreaterThan(0);
      expect(result.name).toBe('Squat');
    });

    it('assigne des ids distincts à chaque exercice', async () => {
      const a = await repo.save(squat);
      const b = await repo.save({ ...squat, name: 'Deadlift' });
      expect(a.id).not.toBe(b.id);
    });

    it('horodate created_at', async () => {
      const result = await repo.save(squat);
      expect(result.created_at).toBeTruthy();
    });
  });

  describe('findAll', () => {
    it('retourne vide quand aucun exercice', async () => {
      expect(await repo.findAll()).toHaveLength(0);
    });

    it('retourne tous les exercices sauvegardés', async () => {
      await repo.save(squat);
      await repo.save({ ...squat, name: 'Deadlift' });
      expect(await repo.findAll()).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it("retourne l'exercice correspondant", async () => {
      const saved = await repo.save(squat);
      const found = await repo.findById(saved.id);
      expect(found?.name).toBe('Squat');
    });

    it('retourne null si id inconnu', async () => {
      expect(await repo.findById(999)).toBeNull();
    });
  });

  describe('findByType', () => {
    it('filtre par type', async () => {
      await repo.save(squat);
      await repo.save({ ...squat, name: 'Étirement', type: 'etirement' });
      const result = await repo.findByType('musculation');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Squat');
    });

    it('retourne vide si aucun exercice du type', async () => {
      await repo.save(squat);
      expect(await repo.findByType('cardio')).toHaveLength(0);
    });
  });

  describe('delete', () => {
    it("supprime l'exercice", async () => {
      const saved = await repo.save(squat);
      await repo.delete(saved.id);
      expect(await repo.findById(saved.id)).toBeNull();
    });

    it("ne supprime que l'exercice ciblé", async () => {
      const a = await repo.save(squat);
      const b = await repo.save({ ...squat, name: 'Deadlift' });
      await repo.delete(a.id);
      const remaining = await repo.findAll();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(b.id);
    });
  });

  describe('findByName', () => {
    it('retourne null si aucun exercice avec ce nom', async () => {
      expect(await repo.findByName('Inconnu')).toBeNull();
    });

    it("retourne l'exercice si nom exact", async () => {
      await repo.save(squat);
      const found = await repo.findByName('Squat');
      expect(found?.name).toBe('Squat');
    });

    it('est insensible à la casse', async () => {
      await repo.save(squat);
      expect((await repo.findByName('squat'))?.name).toBe('Squat');
      expect((await repo.findByName('SQUAT'))?.name).toBe('Squat');
    });

    it('trim les espaces avant comparaison', async () => {
      await repo.save(squat);
      expect((await repo.findByName('  Squat  '))?.name).toBe('Squat');
    });
  });
}
