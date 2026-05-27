import { WorkoutService, CreateWorkoutInput, UpdateWorkoutInput } from './WorkoutService';
import { InMemoryWorkoutRepository } from '../repositories/InMemoryWorkoutRepository';

function makeService() {
  return new WorkoutService(new InMemoryWorkoutRepository());
}

describe('WorkoutService', () => {
  describe('create', () => {
    it('crée une séance valide', async () => {
      const svc = makeService();
      const result = await svc.create({ name: 'Push A', programId: 1 });
      expect(result.name).toBe('Push A');
      expect(result.program_id).toBe(1);
      expect(result.id).toBeGreaterThan(0);
    });

    it('lève une erreur si le nom est vide', async () => {
      const svc = makeService();
      await expect(svc.create({ name: '', programId: 1 })).rejects.toThrow('Le nom est requis');
    });

    it('assigne order_index = 0 pour la première séance', async () => {
      const svc = makeService();
      const result = await svc.create({ name: 'Push A', programId: 1 });
      expect(result.order_index).toBe(0);
    });

    it('incrémente order_index pour les séances suivantes', async () => {
      const svc = makeService();
      await svc.create({ name: 'Push A', programId: 1 });
      const second = await svc.create({ name: 'Pull A', programId: 1 });
      expect(second.order_index).toBe(1);
    });
  });

  describe('update', () => {
    it('met à jour le nom', async () => {
      const svc = makeService();
      const created = await svc.create({ name: 'Push A', programId: 1 });
      const updated = await svc.update(created.id, { name: 'Push A v2' });
      expect(updated.name).toBe('Push A v2');
    });

    it('lève une erreur si le nom est vide', async () => {
      const svc = makeService();
      const created = await svc.create({ name: 'Push A', programId: 1 });
      await expect(svc.update(created.id, { name: '' })).rejects.toThrow('Le nom est requis');
    });

    it('lève une erreur si la séance est introuvable', async () => {
      const svc = makeService();
      await expect(svc.update(999, { name: 'X' })).rejects.toThrow('Séance 999 introuvable');
    });
  });

  describe('listByProgram', () => {
    it('retourne les séances du programme', async () => {
      const svc = makeService();
      await svc.create({ name: 'Push A', programId: 1 });
      await svc.create({ name: 'Pull A', programId: 1 });
      expect(await svc.listByProgram(1)).toHaveLength(2);
    });

    it("ne retourne pas les séances d'un autre programme", async () => {
      const svc = makeService();
      await svc.create({ name: 'Push A', programId: 1 });
      await svc.create({ name: 'Legs', programId: 2 });
      expect(await svc.listByProgram(1)).toHaveLength(1);
    });
  });

  describe('remove', () => {
    it('supprime une séance existante', async () => {
      const svc = makeService();
      const w = await svc.create({ name: 'Push A', programId: 1 });
      await svc.remove(w.id);
      expect(await svc.getById(w.id)).toBeNull();
    });
  });
});
