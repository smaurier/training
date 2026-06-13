import { ExerciseHistoryService } from './ExerciseHistoryService';
import { InMemorySetLogRepository } from '../repositories/InMemorySetLogRepository';
import { InMemoryExerciseRepository } from '../repositories/InMemoryExerciseRepository';

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

function makeService() {
  const setLogRepo = new InMemorySetLogRepository();
  const exerciseRepo = new InMemoryExerciseRepository();
  return { service: new ExerciseHistoryService(setLogRepo, exerciseRepo), setLogRepo, exerciseRepo };
}

describe('ExerciseHistoryService.getHistory', () => {
  it('lève une erreur si exerciseId inexistant', async () => {
    const { service } = makeService();
    await expect(service.getHistory(999)).rejects.toThrow('Exercise 999 not found');
  });

  it('retourne lastSession null si aucun set_log', async () => {
    const { service, exerciseRepo } = makeService();
    const ex = await exerciseRepo.save(baseExerciseDto);
    const result = await service.getHistory(ex.id);
    expect(result.lastSession).toBeNull();
    expect(result.recentSessions).toEqual([]);
  });

  it('groupe les sets par session_log_id', async () => {
    const { service, setLogRepo, exerciseRepo } = makeService();
    const ex = await exerciseRepo.save(baseExerciseDto);
    await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 5, weight_done: 80, rpe: null, completed_at: '2026-06-01T10:00:00.000Z' });
    await setLogRepo.save({ session_log_id: 1, set_id: 2, exercise_id: ex.id, reps_done: 5, weight_done: 80, rpe: null, completed_at: '2026-06-01T10:05:00.000Z' });
    const result = await service.getHistory(ex.id);
    expect(result.recentSessions).toHaveLength(1);
    expect(result.recentSessions[0].sets).toHaveLength(2);
  });

  it('retourne sessions triées DESC — plus récente en premier', async () => {
    const { service, setLogRepo, exerciseRepo } = makeService();
    const ex = await exerciseRepo.save(baseExerciseDto);
    await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 5, weight_done: 80, rpe: null, completed_at: '2026-06-01T10:00:00.000Z' });
    await setLogRepo.save({ session_log_id: 2, set_id: 2, exercise_id: ex.id, reps_done: 5, weight_done: 82.5, rpe: null, completed_at: '2026-06-08T10:00:00.000Z' });
    const result = await service.getHistory(ex.id);
    expect(result.lastSession?.sessionLogId).toBe(2);
    expect(result.recentSessions[0].sessionLogId).toBe(2);
    expect(result.recentSessions[1].sessionLogId).toBe(1);
  });

  it('lastSession = recentSessions[0]', async () => {
    const { service, setLogRepo, exerciseRepo } = makeService();
    const ex = await exerciseRepo.save(baseExerciseDto);
    await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 5, weight_done: 80, rpe: null, completed_at: '2026-06-01T10:00:00.000Z' });
    const result = await service.getHistory(ex.id);
    expect(result.lastSession).toEqual(result.recentSessions[0]);
  });

  it('bestSet = set avec poids le plus élevé', async () => {
    const { service, setLogRepo, exerciseRepo } = makeService();
    const ex = await exerciseRepo.save(baseExerciseDto);
    await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 5, weight_done: 80, rpe: null, completed_at: '2026-06-01T10:00:00.000Z' });
    await setLogRepo.save({ session_log_id: 1, set_id: 2, exercise_id: ex.id, reps_done: 3, weight_done: 85, rpe: null, completed_at: '2026-06-01T10:05:00.000Z' });
    const result = await service.getHistory(ex.id);
    expect(result.lastSession?.bestSet).toEqual({ reps: 3, weight: 85 });
  });

  it('bestSet = reps max si tous les sets sont weight=0 (bodyweight)', async () => {
    const { service, setLogRepo, exerciseRepo } = makeService();
    const ex = await exerciseRepo.save(baseExerciseDto);
    await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 8, weight_done: 0, rpe: null, completed_at: '2026-06-01T10:00:00.000Z' });
    await setLogRepo.save({ session_log_id: 1, set_id: 2, exercise_id: ex.id, reps_done: 12, weight_done: 0, rpe: null, completed_at: '2026-06-01T10:05:00.000Z' });
    const result = await service.getHistory(ex.id);
    expect(result.lastSession?.bestSet).toEqual({ reps: 12, weight: 0 });
  });

  it('respecte la limite — limit=2 retourne max 2 sessions', async () => {
    const { service, setLogRepo, exerciseRepo } = makeService();
    const ex = await exerciseRepo.save(baseExerciseDto);
    for (let i = 1; i <= 3; i++) {
      await setLogRepo.save({ session_log_id: i, set_id: i, exercise_id: ex.id, reps_done: 5, weight_done: 80, rpe: null, completed_at: `2026-06-0${i}T10:00:00.000Z` });
    }
    const result = await service.getHistory(ex.id, 2);
    expect(result.recentSessions).toHaveLength(2);
  });
});

describe('ExerciseHistoryService.getLoggedExercises', () => {
  it('retourne [] si aucun set_log', async () => {
    const { service } = makeService();
    expect(await service.getLoggedExercises()).toEqual([]);
  });

  it('retourne uniquement les exercices loggés, triés alphabétiquement', async () => {
    const { service, setLogRepo, exerciseRepo } = makeService();
    const squat = await exerciseRepo.save({ ...baseExerciseDto, name: 'Squat' });
    const bench = await exerciseRepo.save({ ...baseExerciseDto, name: 'Développé couché' });
    await exerciseRepo.save({ ...baseExerciseDto, name: 'Curl biceps' }); // jamais loggé
    await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: squat.id, reps_done: 5, weight_done: 80, rpe: null, completed_at: '2026-06-01T10:00:00.000Z' });
    await setLogRepo.save({ session_log_id: 1, set_id: 2, exercise_id: bench.id, reps_done: 8, weight_done: 60, rpe: null, completed_at: '2026-06-01T10:05:00.000Z' });
    const result = await service.getLoggedExercises();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Développé couché');
    expect(result[1].name).toBe('Squat');
  });

  it('déduplique — même exercice loggé plusieurs fois apparaît une seule fois', async () => {
    const { service, setLogRepo, exerciseRepo } = makeService();
    const ex = await exerciseRepo.save(baseExerciseDto);
    await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 5, weight_done: 80, rpe: null, completed_at: '2026-06-01T10:00:00.000Z' });
    await setLogRepo.save({ session_log_id: 2, set_id: 2, exercise_id: ex.id, reps_done: 5, weight_done: 80, rpe: null, completed_at: '2026-06-08T10:00:00.000Z' });
    const result = await service.getLoggedExercises();
    expect(result).toHaveLength(1);
  });
});
