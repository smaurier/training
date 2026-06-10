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

  describe('findByExerciseId', () => {
    it('retourne [] si aucun log', async () => {
      expect(await repo.findByExerciseId(5)).toHaveLength(0);
    });
    it('retourne seulement les logs de cet exercice', async () => {
      await repo.save(dto1);
      await repo.save({ ...dto1, exercise_id: 7, set_id: 11, completed_at: '2026-01-01T10:06:00.000Z' });
      expect(await repo.findByExerciseId(5)).toHaveLength(1);
    });
    it('retourne les logs triés par completed_at ASC', async () => {
      await repo.save({ ...dto1, completed_at: '2026-01-02T10:05:00.000Z' });
      await repo.save({ ...dto1, set_id: 11, completed_at: '2026-01-01T10:05:00.000Z' });
      const logs = await repo.findByExerciseId(5);
      expect(logs[0].completed_at).toBe('2026-01-01T10:05:00.000Z');
    });
  });

  describe('findFromDate', () => {
    it('retourne [] si aucun log', async () => {
      expect(await repo.findFromDate('2026-01-01T00:00:00.000Z')).toHaveLength(0);
    });
    it('exclut les logs antérieurs à from', async () => {
      await repo.save({ ...dto1, completed_at: '2025-12-31T10:05:00.000Z' });
      await repo.save({ ...dto1, set_id: 11, completed_at: '2026-01-01T10:05:00.000Z' });
      const logs = await repo.findFromDate('2026-01-01T00:00:00.000Z');
      expect(logs).toHaveLength(1);
      expect(logs[0].completed_at).toBe('2026-01-01T10:05:00.000Z');
    });
    it('inclut les logs exactement à from', async () => {
      await repo.save({ ...dto1, completed_at: '2026-01-01T00:00:00.000Z' });
      expect(await repo.findFromDate('2026-01-01T00:00:00.000Z')).toHaveLength(1);
    });
  });

  describe('findDistinctExerciseIds', () => {
    it('retourne [] si aucun log', async () => {
      expect(await repo.findDistinctExerciseIds()).toHaveLength(0);
    });
    it('pas de doublons', async () => {
      await repo.save({ ...dto1, exercise_id: 5 });
      await repo.save({ ...dto1, set_id: 11, exercise_id: 5, completed_at: '2026-01-01T10:06:00.000Z' });
      await repo.save({ ...dto1, set_id: 12, exercise_id: 7, completed_at: '2026-01-01T10:07:00.000Z' });
      const ids = await repo.findDistinctExerciseIds();
      expect(ids).toHaveLength(2);
      expect(ids).toContain(5);
      expect(ids).toContain(7);
    });
  });

  describe('deleteBySetAndSession', () => {
    it('supprime le log correspondant', async () => {
      await repo.save(dto1);
      await repo.save({ ...dto1, set_id: 11, completed_at: '2026-01-01T10:06:00.000Z' });
      await repo.deleteBySetAndSession(10, 1);
      expect(await repo.findBySessionLogId(1)).toHaveLength(1);
    });
    it('ne supprime rien si set_id ou session_log_id ne correspond pas', async () => {
      await repo.save(dto1);
      await repo.deleteBySetAndSession(99, 1);
      expect(await repo.findBySessionLogId(1)).toHaveLength(1);
    });
    it('ne lève pas si le log est absent', async () => {
      await expect(repo.deleteBySetAndSession(10, 1)).resolves.toBeUndefined();
    });
  });
}
