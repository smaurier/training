import type { ISettingsRepository } from './ISettingsRepository';

export function runSettingsRepositoryContractTests(createRepo: () => ISettingsRepository) {
  let repo: ISettingsRepository;
  beforeEach(() => { repo = createRepo(); });

  describe('get', () => {
    it('retourne null si la clé est absente', async () => {
      const result = await repo.get('theme');
      expect(result).toBeNull();
    });

    it('retourne la valeur si la clé existe', async () => {
      await repo.set('theme', 'dark');
      const result = await repo.get('theme');
      expect(result).toBe('dark');
    });
  });

  describe('set', () => {
    it('crée une nouvelle entrée', async () => {
      await repo.set('units', 'lbs');
      const result = await repo.get('units');
      expect(result).toBe('lbs');
    });

    it('remplace une entrée existante', async () => {
      await repo.set('theme', 'light');
      await repo.set('theme', 'dark');
      const result = await repo.get('theme');
      expect(result).toBe('dark');
    });
  });
}
