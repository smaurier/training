import { WorkoutExerciseService } from './WorkoutExerciseService';
import { InMemoryWorkoutExerciseRepository } from '../repositories/InMemoryWorkoutExerciseRepository';
import { InMemoryBlockRepository } from '../repositories/InMemoryBlockRepository';
import { InMemorySetRepository } from '../repositories/InMemorySetRepository';
import { InMemoryExerciseRepository } from '../repositories/InMemoryExerciseRepository';
import { UpdateSetDto } from '../repositories/ISetRepository';
import { UpdateBlockDto } from '../repositories/IBlockRepository';

const noopTransaction = async (fn: () => Promise<void>) => fn();

function makeService() {
  const weRepo = new InMemoryWorkoutExerciseRepository();
  const blockRepo = new InMemoryBlockRepository();
  const setRepo = new InMemorySetRepository();
  const exerciseRepo = new InMemoryExerciseRepository();
  const service = new WorkoutExerciseService(weRepo, blockRepo, setRepo, exerciseRepo, noopTransaction);
  return { service, exerciseRepo };
}

async function seedExercise(exerciseRepo: InMemoryExerciseRepository) {
  return exerciseRepo.save({
    name: 'Développé couché',
    type: 'musculation',
    muscle_groups: '["pectoraux"]',
    technical_notes: null,
    is_custom: 0,
    progression_step: 2,
    progression_threshold: 1,
  });
}

describe('WorkoutExerciseService', () => {
  describe('addToWorkout', () => {
    it('crée workout_exercise + block Travail + 1 série par défaut', async () => {
      const { service, exerciseRepo } = makeService();
      const exercise = await seedExercise(exerciseRepo);
      const detail = await service.addToWorkout(1, exercise.id);
      expect(detail.id).toBeGreaterThan(0);
      expect(detail.exercise.name).toBe('Développé couché');
      expect(detail.blocks).toHaveLength(1);
      expect(detail.blocks[0].name).toBe('Travail');
      expect(detail.blocks[0].sets).toHaveLength(1);
      expect(detail.blocks[0].sets[0].reps_min).toBe(3);
      expect(detail.blocks[0].sets[0].reps_max).toBe(8);
      expect(detail.blocks[0].sets[0].weight).toBeNull();
    });

    it('lève une erreur si exercice inexistant', async () => {
      const { service } = makeService();
      await expect(service.addToWorkout(1, 999)).rejects.toThrow('Exercice 999 introuvable');
    });

    it("assigne order_index = nombre d'exercices existants", async () => {
      const { service, exerciseRepo } = makeService();
      const ex1 = await seedExercise(exerciseRepo);
      const ex2 = await exerciseRepo.save({ ...ex1, name: 'Squat' });
      const first = await service.addToWorkout(1, ex1.id);
      const second = await service.addToWorkout(1, ex2.id);
      expect(first.order_index).toBe(0);
      expect(second.order_index).toBe(1);
    });
  });

  describe('getWithDetails', () => {
    it('retourne tableau vide si aucun exercice', async () => {
      const { service } = makeService();
      expect(await service.getWithDetails(1)).toHaveLength(0);
    });

    it('retourne les details complets', async () => {
      const { service, exerciseRepo } = makeService();
      const exercise = await seedExercise(exerciseRepo);
      await service.addToWorkout(1, exercise.id);
      const details = await service.getWithDetails(1);
      expect(details).toHaveLength(1);
      expect(details[0].exercise.name).toBe('Développé couché');
      expect(details[0].blocks[0].sets).toHaveLength(1);
    });
  });

  describe('remove', () => {
    it('supprime le workout_exercise', async () => {
      const { service, exerciseRepo } = makeService();
      const exercise = await seedExercise(exerciseRepo);
      const detail = await service.addToWorkout(1, exercise.id);
      await service.remove(detail.id);
      expect(await service.getWithDetails(1)).toHaveLength(0);
    });
  });

  describe('updateSet', () => {
    it('modifie les champs de la série, visible via getWithDetails', async () => {
      const { service, exerciseRepo } = makeService();
      const exercise = await seedExercise(exerciseRepo);
      const detail = await service.addToWorkout(1, exercise.id);
      const setId = detail.blocks[0].sets[0].id;
      const dto: UpdateSetDto = { reps_min: 5, reps_max: 5, weight: 100, weight_type: 'fixed', rest_duration: 180 };
      await service.updateSet(setId, dto);
      const updated = await service.getWithDetails(1);
      expect(updated[0].blocks[0].sets[0].reps_min).toBe(5);
      expect(updated[0].blocks[0].sets[0].weight).toBe(100);
    });
  });

  describe('addSet', () => {
    it('ajoute une série avec les defaults, order_index = longueur existante', async () => {
      const { service, exerciseRepo } = makeService();
      const exercise = await seedExercise(exerciseRepo);
      const detail = await service.addToWorkout(1, exercise.id);
      const blockId = detail.blocks[0].id;
      await service.addSet(blockId);
      const updated = await service.getWithDetails(1);
      expect(updated[0].blocks[0].sets).toHaveLength(2);
      expect(updated[0].blocks[0].sets[1].order_index).toBe(1);
      expect(updated[0].blocks[0].sets[1].reps_min).toBe(3);
      expect(updated[0].blocks[0].sets[1].weight).toBeNull();
    });
  });

  describe('removeSet', () => {
    it('supprime la série, absente de getWithDetails après suppression', async () => {
      const { service, exerciseRepo } = makeService();
      const exercise = await seedExercise(exerciseRepo);
      const detail = await service.addToWorkout(1, exercise.id);
      const setId = detail.blocks[0].sets[0].id;
      await service.removeSet(setId);
      const updated = await service.getWithDetails(1);
      expect(updated[0].blocks[0].sets).toHaveLength(0);
    });
  });

  describe('addBlock', () => {
    it('crée un bloc + 1 série par défaut, order_index correct', async () => {
      const { service, exerciseRepo } = makeService();
      const exercise = await seedExercise(exerciseRepo);
      const detail = await service.addToWorkout(1, exercise.id);
      await service.addBlock(detail.id, 'Back-off', 0);
      const updated = await service.getWithDetails(1);
      expect(updated[0].blocks).toHaveLength(2);
      expect(updated[0].blocks[1].name).toBe('Back-off');
      expect(updated[0].blocks[1].is_work_block).toBe(0);
      expect(updated[0].blocks[1].order_index).toBe(1);
      expect(updated[0].blocks[1].sets).toHaveLength(1);
      expect(updated[0].blocks[1].sets[0].reps_min).toBe(3);
      expect(updated[0].blocks[1].sets[0].reps_max).toBe(8);
      expect(updated[0].blocks[1].sets[0].weight).toBeNull();
      expect(updated[0].blocks[1].sets[0].weight_type).toBe('fixed');
      expect(updated[0].blocks[1].sets[0].rest_duration).toBe(120);
      expect(updated[0].blocks[1].sets[0].order_index).toBe(0);
    });
  });

  describe('updateBlock', () => {
    it('renomme le bloc, visible via getWithDetails', async () => {
      const { service, exerciseRepo } = makeService();
      const exercise = await seedExercise(exerciseRepo);
      const detail = await service.addToWorkout(1, exercise.id);
      const blockId = detail.blocks[0].id;
      const dto: UpdateBlockDto = { name: 'Échauffement' };
      await service.updateBlock(blockId, dto);
      const updated = await service.getWithDetails(1);
      expect(updated[0].blocks[0].name).toBe('Échauffement');
    });
  });

  describe('removeBlock', () => {
    it('supprime le bloc, absent de getWithDetails après suppression', async () => {
      const { service, exerciseRepo } = makeService();
      const exercise = await seedExercise(exerciseRepo);
      const detail = await service.addToWorkout(1, exercise.id);
      const blockId = detail.blocks[0].id;
      await service.removeBlock(blockId);
      const updated = await service.getWithDetails(1);
      expect(updated[0].blocks).toHaveLength(0);
    });
  });
});
