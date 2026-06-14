import { ExerciseService, SafeDeleteConflict } from './ExerciseService';
import { InMemoryExerciseRepository } from '../repositories/InMemoryExerciseRepository';
import { InMemorySetLogRepository } from '../repositories/InMemorySetLogRepository';
import { InMemoryWorkoutExerciseRepository } from '../repositories/InMemoryWorkoutExerciseRepository';

// On injecte des repos en mémoire — pas besoin de SQLite pour tester la logique métier.
// C'est la force du pattern Repository : le service ne sait pas ce qu'il y a derrière.

function makeService() {
  const repo = new InMemoryExerciseRepository();
  const setLogRepo = new InMemorySetLogRepository();
  const weRepo = new InMemoryWorkoutExerciseRepository();
  const service = new ExerciseService(repo, setLogRepo, weRepo);
  return { service, repo, setLogRepo, weRepo };
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

  describe('ExerciseService.safeDelete', () => {
    const exDto = { name: 'Squat', type: 'musculation' as const, muscle_groups: '[]', technical_notes: null, description: null, is_custom: 0 as const, progression_step: 2.5, progression_threshold: 1 };

    it('supprime si aucun log ni programme', async () => {
      const { service, repo } = makeService();
      const ex = await repo.save(exDto);
      await service.safeDelete(ex.id);
      expect(await repo.findById(ex.id)).toBeNull();
    });

    it('throw SafeDeleteConflict si set_logs existent', async () => {
      const { service, repo, setLogRepo } = makeService();
      const ex = await repo.save(exDto);
      await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 5, weight_done: 80, rpe: null, completed_at: '2026-06-01T10:00:00.000Z' });
      await expect(service.safeDelete(ex.id)).rejects.toBeInstanceOf(SafeDeleteConflict);
    });

    it('throw SafeDeleteConflict avec sessions > 0 si set_logs existent', async () => {
      const { service, repo, setLogRepo } = makeService();
      const ex = await repo.save(exDto);
      await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 5, weight_done: 80, rpe: null, completed_at: '2026-06-01T10:00:00.000Z' });
      const err = await service.safeDelete(ex.id).catch(e => e);
      expect(err.sessions).toBe(1);
      expect(err.programs).toBe(0);
    });

    it('throw SafeDeleteConflict si workout_exercises existent', async () => {
      const { service, repo, weRepo } = makeService();
      const ex = await repo.save(exDto);
      await weRepo.save({ workout_id: 1, exercise_id: ex.id, order_index: 0 });
      const err = await service.safeDelete(ex.id).catch(e => e);
      expect(err).toBeInstanceOf(SafeDeleteConflict);
      expect(err.programs).toBe(1);
    });

    it('force=true supprime même avec logs et programmes', async () => {
      const { service, repo, setLogRepo, weRepo } = makeService();
      const ex = await repo.save(exDto);
      await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 5, weight_done: 80, rpe: null, completed_at: '2026-06-01T10:00:00.000Z' });
      await weRepo.save({ workout_id: 1, exercise_id: ex.id, order_index: 0 });
      await service.safeDelete(ex.id, true);
      expect(await repo.findById(ex.id)).toBeNull();
    });
  });
});
