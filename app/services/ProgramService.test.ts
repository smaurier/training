import { ProgramService } from './ProgramService';
import { InMemoryProgramRepository } from '../repositories/InMemoryProgramRepository';

function makeService() {
  return new ProgramService(new InMemoryProgramRepository());
}

describe('ProgramService', () => {
  describe('create', () => {
    it('crée un programme valide', async () => {
      const svc = makeService();
      const result = await svc.create({ name: 'Push', description: null });
      expect(result.name).toBe('Push');
      expect(result.id).toBeGreaterThan(0);
    });

    it('lève une erreur si le nom est vide', async () => {
      const svc = makeService();
      await expect(svc.create({ name: '', description: null })).rejects.toThrow('Le nom est requis');
    });

    it('lève une erreur si le nom ne contient que des espaces', async () => {
      const svc = makeService();
      await expect(svc.create({ name: '   ', description: null })).rejects.toThrow('Le nom est requis');
    });

    it('crée avec is_active à 0 par défaut', async () => {
      const svc = makeService();
      const result = await svc.create({ name: 'Push', description: null });
      expect(result.is_active).toBe(0);
    });
  });

  describe('update', () => {
    it('met à jour le nom et la description', async () => {
      const svc = makeService();
      const created = await svc.create({ name: 'Push', description: null });
      const updated = await svc.update(created.id, { name: 'Push B', description: 'V2' });
      expect(updated.name).toBe('Push B');
      expect(updated.description).toBe('V2');
    });

    it('lève une erreur si le nom est vide', async () => {
      const svc = makeService();
      const created = await svc.create({ name: 'Push', description: null });
      await expect(svc.update(created.id, { name: '', description: null })).rejects.toThrow('Le nom est requis');
    });

    it('lève une erreur si le programme est introuvable', async () => {
      const svc = makeService();
      await expect(svc.update(999, { name: 'X', description: null })).rejects.toThrow('Programme 999 introuvable');
    });
  });

  describe('setActive', () => {
    it('marque un programme comme actif', async () => {
      const svc = makeService();
      const p = await svc.create({ name: 'Push', description: null });
      await svc.setActive(p.id);
      const updated = await svc.getById(p.id);
      expect(updated?.is_active).toBe(1);
    });

    it('désactive les autres programmes', async () => {
      const svc = makeService();
      const a = await svc.create({ name: 'Push', description: null });
      const b = await svc.create({ name: 'Pull', description: null });
      await svc.setActive(a.id);
      await svc.setActive(b.id);
      const updatedA = await svc.getById(a.id);
      expect(updatedA?.is_active).toBe(0);
    });

    it('lève une erreur si le programme est introuvable', async () => {
      const svc = makeService();
      await expect(svc.setActive(999)).rejects.toThrow('Programme 999 introuvable');
    });
  });

  describe('remove', () => {
    it('supprime un programme existant', async () => {
      const svc = makeService();
      const p = await svc.create({ name: 'Push', description: null });
      await svc.remove(p.id);
      expect(await svc.getById(p.id)).toBeNull();
    });
  });

  describe('listAll', () => {
    it('retourne tous les programmes', async () => {
      const svc = makeService();
      await svc.create({ name: 'Push', description: null });
      await svc.create({ name: 'Pull', description: null });
      expect(await svc.listAll()).toHaveLength(2);
    });
  });
});
