import { ExerciseService } from './ExerciseService';
import { InMemoryExerciseRepository } from '../repositories/InMemoryExerciseRepository';

// On injecte un repo en mémoire — pas besoin de SQLite pour tester la logique métier.
// C'est la force du pattern Repository : le service ne sait pas ce qu'il y a derrière.

function makeService() {
  const repo = new InMemoryExerciseRepository();
  const service = new ExerciseService(repo);
  return { service, repo };
}

describe('ExerciseService', () => {
  describe('create', () => {
    it('crée et retourne un exercice valide', async () => {
      const { service } = makeService();
      const exercise = await service.create({
        name: 'Squat',
        type: 'musculation',
        muscle_groups: ['quadriceps', 'fessiers'],
        progression_step: 2.5,
        progression_threshold: 1,
      });
      expect(exercise.id).toBeGreaterThan(0);
      expect(exercise.name).toBe('Squat');
    });

    it('rejette un nom vide', async () => {
      const { service } = makeService();
      await expect(
        service.create({ name: '  ', type: 'musculation', muscle_groups: [], progression_step: 2.5, progression_threshold: 1 })
      ).rejects.toThrow('Le nom est requis');
    });

    it('rejette un progression_step négatif', async () => {
      const { service } = makeService();
      await expect(
        service.create({ name: 'Squat', type: 'musculation', muscle_groups: [], progression_step: -1, progression_threshold: 1 })
      ).rejects.toThrow('Le pas de progression doit être positif');
    });
  });

  describe('listAll', () => {
    it('retourne tous les exercices', async () => {
      const { service } = makeService();
      await service.create({ name: 'Squat', type: 'musculation', muscle_groups: [], progression_step: 2.5, progression_threshold: 1 });
      await service.create({ name: 'Deadlift', type: 'musculation', muscle_groups: [], progression_step: 2.5, progression_threshold: 1 });
      const list = await service.listAll();
      expect(list).toHaveLength(2);
    });

    it('retourne vide si aucun exercice', async () => {
      const { service } = makeService();
      expect(await service.listAll()).toHaveLength(0);
    });
  });

  describe('getById', () => {
    it('retourne l\'exercice correspondant', async () => {
      const { service } = makeService();
      const created = await service.create({ name: 'Bench Press', type: 'musculation', muscle_groups: [], progression_step: 2, progression_threshold: 1 });
      const found = await service.getById(created.id);
      expect(found?.name).toBe('Bench Press');
    });

    it('retourne null si non trouvé', async () => {
      const { service } = makeService();
      expect(await service.getById(999)).toBeNull();
    });
  });

  describe('remove', () => {
    it('supprime un exercice existant', async () => {
      const { service } = makeService();
      const created = await service.create({ name: 'Curl', type: 'musculation', muscle_groups: [], progression_step: 1.25, progression_threshold: 1 });
      await service.remove(created.id);
      expect(await service.getById(created.id)).toBeNull();
    });

    it('ne plante pas si l\'id n\'existe pas', async () => {
      const { service } = makeService();
      await expect(service.remove(999)).resolves.toBeUndefined();
    });
  });
});
