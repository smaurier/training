import { ISetLogRepository, CreateSetLogDto } from './ISetLogRepository';

const dto1: CreateSetLogDto = {
  session_log_id: 1,
  set_id: 10,
  exercise_id: 5,
  reps_done: 8,
  weight_done: 80,
  rpe: 8,
  completed_at: '2026-01-01T10:05:00.000Z',
};

export function runSetLogRepositoryContractTests(createRepo: () => ISetLogRepository) {
  let repo: ISetLogRepository;
  beforeEach(() => { repo = createRepo(); });

  describe('save', () => {
    it('retourne un SetLog avec id généré', async () => {
      const result = await repo.save(dto1);
      expect(result.id).toBeGreaterThan(0);
      expect(result.reps_done).toBe(8);
      expect(result.weight_done).toBe(80);
      expect(result.rpe).toBe(8);
    });
    it('accepte rpe null', async () => {
      const result = await repo.save({ ...dto1, rpe: null });
      expect(result.rpe).toBeNull();
    });
  });

  describe('findBySessionLogId', () => {
    it('retourne vide si aucun log', async () => {
      expect(await repo.findBySessionLogId(1)).toHaveLength(0);
    });
    it('retourne les logs de la session', async () => {
      await repo.save(dto1);
      await repo.save({ ...dto1, set_id: 11, completed_at: '2026-01-01T10:06:00.000Z' });
      expect(await repo.findBySessionLogId(1)).toHaveLength(2);
    });
    it("ne retourne pas les logs d'une autre session", async () => {
      await repo.save(dto1);
      await repo.save({ ...dto1, session_log_id: 2, set_id: 11, completed_at: '2026-01-01T10:06:00.000Z' });
      expect(await repo.findBySessionLogId(1)).toHaveLength(1);
    });
  });

  describe('findBySetId', () => {
    it('retourne vide si aucun log', async () => {
      expect(await repo.findBySetId(10)).toHaveLength(0);
    });
    it('retourne les logs pour ce set', async () => {
      await repo.save(dto1);
      await repo.save({ ...dto1, session_log_id: 2, completed_at: '2026-01-02T10:05:00.000Z' });
      expect(await repo.findBySetId(10)).toHaveLength(2);
    });
  });

  describe('countBySessionLogIds', () => {
    it('retourne {} si ids vide', async () => {
      await repo.save(dto1);
      expect(await repo.countBySessionLogIds([])).toEqual({});
    });
    it('retourne les comptes par session', async () => {
      await repo.save(dto1);
      await repo.save({ ...dto1, set_id: 11, completed_at: '2026-01-01T10:06:00.000Z' });
      await repo.save({ ...dto1, session_log_id: 2, set_id: 12, completed_at: '2026-01-01T10:07:00.000Z' });
      const counts = await repo.countBySessionLogIds([1, 2]);
      expect(counts[1]).toBe(2);
      expect(counts[2]).toBe(1);
    });
    it("n'inclut pas les ids sans sets", async () => {
      const counts = await repo.countBySessionLogIds([99]);
      expect(counts[99]).toBeUndefined();
    });
  });
}
