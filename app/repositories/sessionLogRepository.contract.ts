import { ISessionLogRepository, CreateSessionLogDto } from './ISessionLogRepository';

const dto1: CreateSessionLogDto = {
  workout_id: 1,
  started_at: '2026-01-01T10:00:00.000Z',
  checkin_energy: 3,
  checkin_fatigue: 2,
  checkin_sleep: 3,
  notes: null,
};

export function runSessionLogRepositoryContractTests(createRepo: () => ISessionLogRepository) {
  let repo: ISessionLogRepository;
  beforeEach(() => { repo = createRepo(); });

  describe('save', () => {
    it('retourne un SessionLog avec id généré et ended_at null', async () => {
      const result = await repo.save(dto1);
      expect(result.id).toBeGreaterThan(0);
      expect(result.workout_id).toBe(1);
      expect(result.ended_at).toBeNull();
      expect(result.checkin_energy).toBe(3);
    });
    it('assigne des ids distincts', async () => {
      const a = await repo.save(dto1);
      const b = await repo.save({ ...dto1, started_at: '2026-01-02T10:00:00.000Z' });
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('findById', () => {
    it('retourne le log correspondant', async () => {
      const saved = await repo.save(dto1);
      const found = await repo.findById(saved.id);
      expect(found?.workout_id).toBe(1);
    });
    it('retourne null si id inconnu', async () => {
      expect(await repo.findById(999)).toBeNull();
    });
  });

  describe('findByWorkoutId', () => {
    it('retourne vide si aucun log', async () => {
      expect(await repo.findByWorkoutId(1)).toHaveLength(0);
    });
    it('retourne les logs du workout', async () => {
      await repo.save(dto1);
      await repo.save({ ...dto1, started_at: '2026-01-02T10:00:00.000Z' });
      expect(await repo.findByWorkoutId(1)).toHaveLength(2);
    });
    it("ne retourne pas les logs d'un autre workout", async () => {
      await repo.save(dto1);
      await repo.save({ ...dto1, workout_id: 2, started_at: '2026-01-02T10:00:00.000Z' });
      expect(await repo.findByWorkoutId(1)).toHaveLength(1);
    });
  });

  describe('findLatestByWorkoutIds', () => {
    it('retourne null si aucun log', async () => {
      expect(await repo.findLatestByWorkoutIds([1, 2])).toBeNull();
    });
    it('retourne le log le plus récent parmi plusieurs workouts', async () => {
      await repo.save({ ...dto1, workout_id: 1, started_at: '2026-01-01T10:00:00.000Z' });
      await repo.save({ ...dto1, workout_id: 2, started_at: '2026-01-03T10:00:00.000Z' });
      const latest = await repo.findLatestByWorkoutIds([1, 2]);
      expect(latest?.workout_id).toBe(2);
    });
    it('retourne null si workoutIds vide', async () => {
      await repo.save(dto1);
      expect(await repo.findLatestByWorkoutIds([])).toBeNull();
    });
  });

  describe('complete', () => {
    it('met à jour ended_at', async () => {
      const saved = await repo.save(dto1);
      await repo.complete(saved.id, '2026-01-01T11:00:00.000Z');
      const updated = await repo.findById(saved.id);
      expect(updated?.ended_at).toBe('2026-01-01T11:00:00.000Z');
    });
  });

  describe('findAll', () => {
    it('retourne [] si aucune session', async () => {
      expect(await repo.findAll()).toHaveLength(0);
    });
    it('retourne toutes les sessions ordonnées par started_at DESC', async () => {
      await repo.save({ ...dto1, started_at: '2026-01-01T10:00:00.000Z' });
      await repo.save({ ...dto1, started_at: '2026-01-03T10:00:00.000Z' });
      await repo.save({ ...dto1, started_at: '2026-01-02T10:00:00.000Z' });
      const all = await repo.findAll();
      expect(all).toHaveLength(3);
      expect(all[0].started_at).toBe('2026-01-03T10:00:00.000Z');
      expect(all[2].started_at).toBe('2026-01-01T10:00:00.000Z');
    });
  });
}
