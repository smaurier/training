import { IPersonalRecordRepository, CreatePersonalRecordDto } from './IPersonalRecordRepository';

const dto1: CreatePersonalRecordDto = {
  exercise_id: 1,
  weight: 100,
  reps: 5,
  estimated_1rm: 116.7,
  achieved_at: '2026-01-01T10:00:00.000Z',
  session_log_id: null,
};

export function runPersonalRecordRepositoryContractTests(createRepo: () => IPersonalRecordRepository) {
  let repo: IPersonalRecordRepository;
  beforeEach(() => { repo = createRepo(); });

  describe('save', () => {
    it('retourne un PR avec id généré', async () => {
      const result = await repo.save(dto1);
      expect(result.id).toBeGreaterThan(0);
      expect(result.estimated_1rm).toBe(116.7);
    });
  });

  describe('findBestByExerciseId', () => {
    it('retourne null si aucun PR', async () => {
      expect(await repo.findBestByExerciseId(1)).toBeNull();
    });
    it('retourne le PR avec le 1RM le plus élevé', async () => {
      await repo.save(dto1);
      await repo.save({ ...dto1, weight: 105, reps: 3, estimated_1rm: 115.5, achieved_at: '2026-01-02T10:00:00.000Z' });
      const best = await repo.findBestByExerciseId(1);
      expect(best?.estimated_1rm).toBe(116.7);
    });
    it("ne retourne pas le PR d'un autre exercice", async () => {
      await repo.save({ ...dto1, exercise_id: 2, estimated_1rm: 200 });
      expect(await repo.findBestByExerciseId(1)).toBeNull();
    });
  });
}
