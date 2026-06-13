import { InMemorySessionLogRepository } from '../repositories/InMemorySessionLogRepository';
import { InMemorySetLogRepository } from '../repositories/InMemorySetLogRepository';
import { InMemoryPersonalRecordRepository } from '../repositories/InMemoryPersonalRecordRepository';
import { InMemoryExerciseRepository } from '../repositories/InMemoryExerciseRepository';
import { ProgressionService } from './ProgressionService';

function makeService() {
  const sessionLogRepo = new InMemorySessionLogRepository();
  const setLogRepo = new InMemorySetLogRepository();
  const personalRecordRepo = new InMemoryPersonalRecordRepository();
  const exerciseRepo = new InMemoryExerciseRepository();
  const service = new ProgressionService(sessionLogRepo, setLogRepo, personalRecordRepo, exerciseRepo);
  return { service, sessionLogRepo, setLogRepo, personalRecordRepo, exerciseRepo };
}

const NOW = new Date('2026-05-29T12:00:00.000Z');

const baseExerciseDto = {
  name: 'Squat',
  type: 'musculation' as const,
  muscle_groups: '[]',
  technical_notes: null,
  description: null,
  is_custom: 0 as const,
  progression_step: 2.5,
  progression_threshold: 1,
};

const baseSessionDto = {
  workout_id: 1,
  started_at: '2026-05-01T10:00:00.000Z',
  checkin_energy: null,
  checkin_fatigue: null,
  checkin_sleep: null,
  notes: null,
};

describe('ProgressionService', () => {
  describe('getDashboardStats', () => {
    it('retourne 0 séances ce mois si aucune session', async () => {
      const { service } = makeService();
      const stats = await service.getDashboardStats(NOW);
      expect(stats.sessionCount).toBe(0);
    });

    it('compte les séances du mois courant uniquement', async () => {
      const { service, sessionLogRepo } = makeService();
      await sessionLogRepo.save({ ...baseSessionDto, started_at: '2026-05-10T10:00:00.000Z' });
      await sessionLogRepo.save({ ...baseSessionDto, started_at: '2026-05-15T10:00:00.000Z' });
      await sessionLogRepo.save({ ...baseSessionDto, started_at: '2026-04-10T10:00:00.000Z' });
      const stats = await service.getDashboardStats(NOW);
      expect(stats.sessionCount).toBe(2);
    });

    it('compte les PRs du mois courant uniquement', async () => {
      const { service, personalRecordRepo } = makeService();
      await personalRecordRepo.save({ exercise_id: 1, weight: 100, reps: 5, estimated_1rm: 116.7, achieved_at: '2026-05-10T10:00:00.000Z', session_log_id: null });
      await personalRecordRepo.save({ exercise_id: 1, weight: 105, reps: 5, estimated_1rm: 122.5, achieved_at: '2026-04-01T10:00:00.000Z', session_log_id: null });
      const stats = await service.getDashboardStats(NOW);
      expect(stats.prCount).toBe(1);
    });

    it('compte les exercices distincts loggés ce mois', async () => {
      const { service, setLogRepo } = makeService();
      await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: 5, reps_done: 8, weight_done: 80, rpe: null, completed_at: '2026-05-10T10:00:00.000Z' });
      await setLogRepo.save({ session_log_id: 1, set_id: 2, exercise_id: 5, reps_done: 8, weight_done: 80, rpe: null, completed_at: '2026-05-10T10:05:00.000Z' });
      await setLogRepo.save({ session_log_id: 1, set_id: 3, exercise_id: 7, reps_done: 8, weight_done: 60, rpe: null, completed_at: '2026-05-10T10:10:00.000Z' });
      await setLogRepo.save({ session_log_id: 2, set_id: 4, exercise_id: 9, reps_done: 8, weight_done: 100, rpe: null, completed_at: '2026-04-01T10:00:00.000Z' });
      const stats = await service.getDashboardStats(NOW);
      expect(stats.exerciseCount).toBe(2);
    });
  });

  describe('getVolumeByWeek', () => {
    it('retourne toujours 4 entrées même si vides', async () => {
      const { service } = makeService();
      const weeks = await service.getVolumeByWeek(NOW);
      expect(weeks).toHaveLength(4);
      expect(weeks[0].weekLabel).toBe('S-3');
      expect(weeks[3].weekLabel).toBe('Cette sem.');
    });

    it('calcule le volume Σ(reps × weight) par semaine ISO', async () => {
      const { service, setLogRepo } = makeService();
      // NOW = 2026-05-29 (vendredi) → lundi de cette semaine = 2026-05-25
      await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: 5, reps_done: 10, weight_done: 100, rpe: null, completed_at: '2026-05-26T10:00:00.000Z' });
      await setLogRepo.save({ session_log_id: 1, set_id: 2, exercise_id: 5, reps_done: 8, weight_done: 100, rpe: null, completed_at: '2026-05-26T10:05:00.000Z' });
      const weeks = await service.getVolumeByWeek(NOW);
      const thisSem = weeks.find(w => w.weekLabel === 'Cette sem.');
      expect(thisSem?.volume).toBe(1800); // (10+8) * 100
    });
  });

  describe('getRecentPRs', () => {
    it('retourne [] si aucun PR', async () => {
      const { service } = makeService();
      expect(await service.getRecentPRs(5)).toHaveLength(0);
    });

    it('retourne les N plus récents avec le nom de l exercice', async () => {
      const { service, personalRecordRepo, exerciseRepo } = makeService();
      const ex = await exerciseRepo.save(baseExerciseDto);
      await personalRecordRepo.save({ exercise_id: ex.id, weight: 100, reps: 5, estimated_1rm: 116.7, achieved_at: '2026-05-01T10:00:00.000Z', session_log_id: null });
      await personalRecordRepo.save({ exercise_id: ex.id, weight: 105, reps: 5, estimated_1rm: 122.5, achieved_at: '2026-05-15T10:00:00.000Z', session_log_id: null });
      const prs = await service.getRecentPRs(1);
      expect(prs).toHaveLength(1);
      expect(prs[0].exerciseName).toBe('Squat');
      expect(prs[0].weight).toBe(105);
    });
  });

  describe('getExercise1RMList', () => {
    it('retourne [] si aucun set_log', async () => {
      const { service } = makeService();
      expect(await service.getExercise1RMList(NOW)).toHaveLength(0);
    });

    it('calcule le 1RM Epley max par exercice', async () => {
      const { service, setLogRepo, exerciseRepo } = makeService();
      const ex = await exerciseRepo.save(baseExerciseDto);
      await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 5, weight_done: 100, rpe: null, completed_at: '2026-05-10T10:00:00.000Z' });
      await setLogRepo.save({ session_log_id: 1, set_id: 2, exercise_id: ex.id, reps_done: 3, weight_done: 110, rpe: null, completed_at: '2026-05-10T10:05:00.000Z' });
      const list = await service.getExercise1RMList(NOW);
      expect(list).toHaveLength(1);
      // Epley: 100*(1+5/30)=116.67, 110*(1+3/30)=121 → max = 121
      expect(list[0].current1RM).toBe(121);
    });

    it('delta null et "Depuis le début" si tous les logs < 30j', async () => {
      const { service, setLogRepo, exerciseRepo } = makeService();
      const ex = await exerciseRepo.save(baseExerciseDto);
      // NOW = 2026-05-29, log du 2026-05-10 → < 30j
      await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 5, weight_done: 100, rpe: null, completed_at: '2026-05-10T10:00:00.000Z' });
      const list = await service.getExercise1RMList(NOW);
      expect(list[0].delta).toBeNull();
      expect(list[0].deltaLabel).toBe('Depuis le début');
    });

    it('calcule le delta correct si des logs > 30j existent', async () => {
      const { service, setLogRepo, exerciseRepo } = makeService();
      const ex = await exerciseRepo.save(baseExerciseDto);
      // Log ancien (> 30j avant NOW=2026-05-29) : 2026-04-01
      await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 5, weight_done: 100, rpe: null, completed_at: '2026-04-01T10:00:00.000Z' });
      // Log récent : 2026-05-10
      await setLogRepo.save({ session_log_id: 2, set_id: 2, exercise_id: ex.id, reps_done: 5, weight_done: 110, rpe: null, completed_at: '2026-05-10T10:00:00.000Z' });
      const list = await service.getExercise1RMList(NOW);
      // epley(110, 5) = 128.3 (current1RM rounded); base = epley(100,5) = 116.666… (unrounded); delta = round((128.3 - 116.666…) × 10)/10 = 11.6
      expect(list[0].delta).toBe(11.6);
      expect(list[0].deltaLabel).toBe('+11.6 kg vs 30j');
    });

    it('delta = 0 et deltaLabel = "stable" si aucune progression', async () => {
      const { service, setLogRepo, exerciseRepo } = makeService();
      const ex = await exerciseRepo.save(baseExerciseDto);
      // Même charge avant et après 30j
      await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 5, weight_done: 100, rpe: null, completed_at: '2026-04-01T10:00:00.000Z' });
      await setLogRepo.save({ session_log_id: 2, set_id: 2, exercise_id: ex.id, reps_done: 5, weight_done: 100, rpe: null, completed_at: '2026-05-10T10:00:00.000Z' });
      const list = await service.getExercise1RMList(NOW);
      expect(list[0].delta).toBe(0);
      expect(list[0].deltaLabel).toBe('stable');
    });
  });

  describe('getExercise1RMHistory', () => {
    it('retourne une entrée par date calendaire (merge même jour)', async () => {
      const { service, setLogRepo } = makeService();
      // Deux logs le même jour → une seule barre (max)
      await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: 5, reps_done: 5, weight_done: 100, rpe: null, completed_at: '2026-05-10T10:00:00.000Z' });
      await setLogRepo.save({ session_log_id: 2, set_id: 2, exercise_id: 5, reps_done: 5, weight_done: 110, rpe: null, completed_at: '2026-05-10T15:00:00.000Z' });
      const history = await service.getExercise1RMHistory(5);
      expect(history).toHaveLength(1);
      expect(history[0].estimated1RM).toBe(Math.round(110 * (1 + 5 / 30) * 10) / 10);
    });

    it('retourne les entrées ordonnées ASC par date', async () => {
      const { service, setLogRepo } = makeService();
      await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: 5, reps_done: 5, weight_done: 100, rpe: null, completed_at: '2026-05-15T10:00:00.000Z' });
      await setLogRepo.save({ session_log_id: 2, set_id: 2, exercise_id: 5, reps_done: 5, weight_done: 90, rpe: null, completed_at: '2026-05-01T10:00:00.000Z' });
      const history = await service.getExercise1RMHistory(5);
      expect(history[0].estimated1RM).toBeLessThan(history[1].estimated1RM);
    });
  });

  describe('ProgressionService.getVolumeByMuscleGroup', () => {
    it('retourne [] si aucun set_log dans la période', async () => {
      const { service } = makeService();
      const result = await service.getVolumeByMuscleGroup(NOW);
      expect(result).toEqual([]);
    });

    it('retourne volumes Push et Pull agrégés sur 4 semaines', async () => {
      const { service, setLogRepo, exerciseRepo } = makeService();
      const pushEx = await exerciseRepo.save({ ...baseExerciseDto, name: 'Bench', muscle_groups: '["pectoraux"]' });
      const pullEx = await exerciseRepo.save({ ...baseExerciseDto, name: 'Row', muscle_groups: '["grand dorsal"]' });
      await setLogRepo.save({
        session_log_id: 1, set_id: 1, exercise_id: pushEx.id,
        reps_done: 10, weight_done: 80, rpe: null,
        completed_at: '2026-05-27T10:00:00.000Z',
      });
      await setLogRepo.save({
        session_log_id: 1, set_id: 2, exercise_id: pullEx.id,
        reps_done: 10, weight_done: 60, rpe: null,
        completed_at: '2026-05-27T10:00:00.000Z',
      });
      const result = await service.getVolumeByMuscleGroup(NOW);
      expect(result.find(r => r.category === 'Push')?.volume).toBe(800);
      expect(result.find(r => r.category === 'Pull')?.volume).toBe(600);
    });
  });
});
