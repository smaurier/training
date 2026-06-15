import type { IBodyMeasurementRepository } from './IBodyMeasurementRepository';

const dto1 = { date: '2026-06-01', weight_kg: 75.5, waist_cm: 80, arm_cm: null, thigh_cm: null, hip_cm: null };
const dto2 = { date: '2026-06-08', weight_kg: 75.0, waist_cm: 79, arm_cm: 35, thigh_cm: null, hip_cm: null };

export function runBodyMeasurementRepositoryContractTests(createRepo: () => IBodyMeasurementRepository | Promise<IBodyMeasurementRepository>) {
  let repo: IBodyMeasurementRepository;
  beforeEach(async () => { repo = await createRepo(); });

  describe('save', () => {
    it('crée une mesure avec id généré', async () => {
      const result = await repo.save(dto1);
      expect(result.id).toBeGreaterThan(0);
      expect(result.weight_kg).toBe(75.5);
      expect(result.arm_cm).toBeNull();
    });

    it('upsert sur même date — met à jour sans dupliquer', async () => {
      const first = await repo.save(dto1);
      const updated = await repo.save({ ...dto1, weight_kg: 76.0 });
      expect(updated.id).toBe(first.id);
      expect(updated.weight_kg).toBe(76.0);
      const history = await repo.getHistory();
      expect(history).toHaveLength(1);
    });
  });

  describe('getHistory', () => {
    it('retourne tableau vide sans données', async () => {
      expect(await repo.getHistory()).toHaveLength(0);
    });

    it('retourne les mesures en ordre DESC par date', async () => {
      await repo.save(dto1);
      await repo.save(dto2);
      const history = await repo.getHistory();
      expect(history[0].date).toBe('2026-06-08');
      expect(history[1].date).toBe('2026-06-01');
    });

    it('retourne max N entrées si limit fourni', async () => {
      await repo.save(dto1);
      await repo.save(dto2);
      expect(await repo.getHistory(1)).toHaveLength(1);
    });
  });

  describe('getLatest', () => {
    it('retourne null sans données', async () => {
      expect(await repo.getLatest()).toBeNull();
    });

    it('retourne la mesure la plus récente', async () => {
      await repo.save(dto1);
      await repo.save(dto2);
      const latest = await repo.getLatest();
      expect(latest?.date).toBe('2026-06-08');
    });
  });
}
