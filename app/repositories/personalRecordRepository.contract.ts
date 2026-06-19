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

  describe('findAllByExerciseId', () => {
    it('retourne [] si aucun PR', async () => {
      expect(await repo.findAllByExerciseId(1)).toHaveLength(0);
    });
    it('retourne seulement les PRs de cet exercice', async () => {
      await repo.save(dto1);
      await repo.save({ ...dto1, exercise_id: 2, achieved_at: '2026-01-02T10:00:00.000Z' });
      expect(await repo.findAllByExerciseId(1)).toHaveLength(1);
    });
    it('retourne les PRs triés par achieved_at DESC', async () => {
      await repo.save({ ...dto1, achieved_at: '2026-01-01T10:00:00.000Z' });
      await repo.save({ ...dto1, achieved_at: '2026-02-01T10:00:00.000Z' });
      const prs = await repo.findAllByExerciseId(1);
      expect(prs[0].achieved_at).toBe('2026-02-01T10:00:00.000Z');
    });
  });

  describe('findRecent', () => {
    it('retourne [] si aucun PR', async () => {
      expect(await repo.findRecent(5)).toHaveLength(0);
    });
    it('respecte la limite', async () => {
      await repo.save({ ...dto1, achieved_at: '2026-01-01T10:00:00.000Z' });
      await repo.save({ ...dto1, exercise_id: 2, achieved_at: '2026-02-01T10:00:00.000Z' });
      await repo.save({ ...dto1, exercise_id: 3, achieved_at: '2026-03-01T10:00:00.000Z' });
      expect(await repo.findRecent(2)).toHaveLength(2);
    });
    it('retourne les PRs triés par achieved_at DESC', async () => {
      await repo.save({ ...dto1, achieved_at: '2026-01-01T10:00:00.000Z' });
      await repo.save({ ...dto1, exercise_id: 2, achieved_at: '2026-03-01T10:00:00.000Z' });
      const prs = await repo.findRecent(5);
      expect(prs[0].achieved_at).toBe('2026-03-01T10:00:00.000Z');
    });
  });

  describe('deleteBySessionLogId', () => {
    it('supprime les PRs liés à la session', async () => {
      await repo.save({ ...dto1, session_log_id: 42 });
      await repo.save({ ...dto1, exercise_id: 2, session_log_id: 42 });
      await repo.deleteBySessionLogId(42);
      expect(await repo.findRecent(10)).toHaveLength(0);
    });

    it('ne supprime pas les PRs d\'autres sessions', async () => {
      await repo.save({ ...dto1, session_log_id: 42 });
      await repo.save({ ...dto1, exercise_id: 2, session_log_id: 99 });
      await repo.deleteBySessionLogId(42);
      expect(await repo.findRecent(10)).toHaveLength(1);
    });

    it('ne supprime pas les PRs sans session_log_id (anciens PRs)', async () => {
      await repo.save({ ...dto1, session_log_id: null });
      await repo.deleteBySessionLogId(42);
      expect(await repo.findRecent(10)).toHaveLength(1);
    });

    it('ne throw pas si aucun PR pour cette session', async () => {
      await expect(repo.deleteBySessionLogId(9999)).resolves.toBeUndefined();
    });
  });
}
