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
    it('retourne le log le plus récent parmi plusieurs workouts (completed seulement)', async () => {
      const a = await repo.save({ ...dto1, workout_id: 1, started_at: '2026-01-01T10:00:00.000Z' });
      const b = await repo.save({ ...dto1, workout_id: 2, started_at: '2026-01-03T10:00:00.000Z' });
      await repo.complete(a.id, '2026-01-01T11:00:00.000Z');
      await repo.complete(b.id, '2026-01-03T11:00:00.000Z');
      const latest = await repo.findLatestByWorkoutIds([1, 2]);
      expect(latest?.workout_id).toBe(2);
    });
    it('retourne null si workoutIds vide', async () => {
      const saved = await repo.save(dto1);
      await repo.complete(saved.id, '2026-01-01T11:00:00.000Z');
      expect(await repo.findLatestByWorkoutIds([])).toBeNull();
    });
    it('ignore les sessions paused et abandoned', async () => {
      const a = await repo.save({ ...dto1, workout_id: 1, started_at: '2026-01-01T10:00:00.000Z' });
      const b = await repo.save({ ...dto1, workout_id: 2, started_at: '2026-01-03T10:00:00.000Z' });
      await repo.pause(a.id, '{}');
      await repo.abandon(b.id, '2026-01-03T11:00:00.000Z');
      expect(await repo.findLatestByWorkoutIds([1, 2])).toBeNull();
    });
  });

  describe('complete', () => {
    it('met à jour ended_at et status=completed', async () => {
      const saved = await repo.save(dto1);
      await repo.complete(saved.id, '2026-01-01T11:00:00.000Z');
      const updated = await repo.findById(saved.id);
      expect(updated?.ended_at).toBe('2026-01-01T11:00:00.000Z');
      expect(updated?.status).toBe('completed');
    });
  });

  describe('pause', () => {
    it("met status='paused' et paused_position", async () => {
      const saved = await repo.save(dto1);
      const pos = JSON.stringify({ exerciseIdx: 1, blockIdx: 0, setIdx: 2 });
      await repo.pause(saved.id, pos);
      const updated = await repo.findById(saved.id);
      expect(updated?.status).toBe('paused');
      expect(updated?.paused_position).toBe(pos);
    });
  });

  describe('abandon', () => {
    it("met status='abandoned' et ended_at", async () => {
      const saved = await repo.save(dto1);
      await repo.abandon(saved.id, '2026-01-01T12:00:00.000Z');
      const updated = await repo.findById(saved.id);
      expect(updated?.status).toBe('abandoned');
      expect(updated?.ended_at).toBe('2026-01-01T12:00:00.000Z');
    });
  });

  describe('findAnyPaused', () => {
    it('retourne null si aucune session pausée', async () => {
      await repo.save(dto1);
      expect(await repo.findAnyPaused()).toBeNull();
    });
    it('retourne la session pausée', async () => {
      const saved = await repo.save(dto1);
      await repo.pause(saved.id, '{}');
      const result = await repo.findAnyPaused();
      expect(result?.id).toBe(saved.id);
      expect(result?.status).toBe('paused');
    });
    it('ignore sessions completed/abandoned', async () => {
      const a = await repo.save(dto1);
      const b = await repo.save({ ...dto1, started_at: '2026-01-02T10:00:00.000Z' });
      await repo.complete(a.id, '2026-01-01T11:00:00.000Z');
      await repo.abandon(b.id, '2026-01-02T11:00:00.000Z');
      expect(await repo.findAnyPaused()).toBeNull();
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
      expect(all[1].started_at).toBe('2026-01-02T10:00:00.000Z');
      expect(all[2].started_at).toBe('2026-01-01T10:00:00.000Z');
    });
  });

  describe('findMostRecent', () => {
    it('retourne null si aucune session', async () => {
      expect(await repo.findMostRecent()).toBeNull();
    });
    it('retourne la session completed la plus récente', async () => {
      const a = await repo.save({ ...dto1, started_at: '2026-01-01T10:00:00.000Z' });
      const b = await repo.save({ ...dto1, started_at: '2026-01-03T10:00:00.000Z' });
      await repo.complete(a.id, '2026-01-01T11:00:00.000Z');
      await repo.complete(b.id, '2026-01-03T11:00:00.000Z');
      const result = await repo.findMostRecent();
      expect(result?.started_at).toBe('2026-01-03T10:00:00.000Z');
    });
    it('ignore les sessions non completed', async () => {
      const a = await repo.save({ ...dto1, started_at: '2026-01-01T10:00:00.000Z' });
      await repo.pause(a.id, '{}');
      expect(await repo.findMostRecent()).toBeNull();
    });
  });

  describe('findLatestDatesPerWorkout', () => {
    it('retourne null pour chaque workout sans sessions', async () => {
      const map = await repo.findLatestDatesPerWorkout([1, 2]);
      expect(map.get(1)).toBeNull();
      expect(map.get(2)).toBeNull();
    });

    it('retourne la date started_at la plus récente par workout', async () => {
      await repo.save({ ...dto1, workout_id: 1, started_at: '2026-01-01T10:00:00.000Z' });
      await repo.save({ ...dto1, workout_id: 1, started_at: '2026-01-10T10:00:00.000Z' });
      await repo.save({ ...dto1, workout_id: 2, started_at: '2026-01-05T10:00:00.000Z' });
      const map = await repo.findLatestDatesPerWorkout([1, 2]);
      expect(map.get(1)).toBe('2026-01-10T10:00:00.000Z');
      expect(map.get(2)).toBe('2026-01-05T10:00:00.000Z');
    });

    it('retourne une Map vide si workoutIds est vide', async () => {
      await repo.save(dto1);
      const map = await repo.findLatestDatesPerWorkout([]);
      expect(map.size).toBe(0);
    });

    it('met null pour un workout sans sessions parmi des workouts avec sessions', async () => {
      await repo.save({ ...dto1, workout_id: 1, started_at: '2026-01-01T10:00:00.000Z' });
      const map = await repo.findLatestDatesPerWorkout([1, 2]);
      expect(map.get(1)).toBe('2026-01-01T10:00:00.000Z');
      expect(map.get(2)).toBeNull();
    });
  });

  describe('delete', () => {
    it('supprime la session et findById retourne null', async () => {
      const s = await repo.save(dto1);
      await repo.delete(s.id);
      expect(await repo.findById(s.id)).toBeNull();
    });

    it('ne supprime pas les autres sessions', async () => {
      const s1 = await repo.save(dto1);
      const s2 = await repo.save({ ...dto1, workout_id: 2 });
      await repo.delete(s1.id);
      expect(await repo.findById(s2.id)).not.toBeNull();
    });

    it('ne throw pas si id inexistant', async () => {
      await expect(repo.delete(9999)).resolves.toBeUndefined();
    });
  });
}
