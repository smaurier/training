import { PlateauDetectionService } from './PlateauDetectionService';
import { InMemorySetLogRepository } from '../repositories/InMemorySetLogRepository';
import { InMemorySessionLogRepository } from '../repositories/InMemorySessionLogRepository';
import { InMemoryWorkoutExerciseRepository } from '../repositories/InMemoryWorkoutExerciseRepository';
import { InMemoryExerciseRepository } from '../repositories/InMemoryExerciseRepository';

const WORKOUT_ID = 1;
const EXERCISE_ID = 10;

async function makeCtx() {
  const setLogRepo = new InMemorySetLogRepository();
  const sessionLogRepo = new InMemorySessionLogRepository();
  const workoutExerciseRepo = new InMemoryWorkoutExerciseRepository();
  const exerciseRepo = new InMemoryExerciseRepository();

  const exercise = await exerciseRepo.save({
    name: 'Développé couché',
    type: 'musculation',
    muscle_groups: '["pectoraux"]',
    technical_notes: null,
    description: null,
    is_custom: 0,
    progression_step: 2.5,
    progression_threshold: 1,
  });

  await workoutExerciseRepo.save({ workout_id: WORKOUT_ID, exercise_id: exercise.id, order_index: 0 });

  const service = new PlateauDetectionService(setLogRepo, sessionLogRepo, workoutExerciseRepo, exerciseRepo);
  return { setLogRepo, sessionLogRepo, service, exerciseId: exercise.id };
}

async function addCompletedSession(
  sessionLogRepo: InMemorySessionLogRepository,
  setLogRepo: InMemorySetLogRepository,
  exerciseId: number,
  startedAt: string,
  weightDone: number,
): Promise<number> {
  const session = await sessionLogRepo.save({
    workout_id: WORKOUT_ID,
    started_at: startedAt,
    checkin_energy: null,
    checkin_fatigue: null,
    checkin_sleep: null,
    notes: null,
  });
  await sessionLogRepo.complete(session.id, startedAt);
  await setLogRepo.save({
    session_log_id: session.id,
    set_id: 1,
    exercise_id: exerciseId,
    reps_done: 8,
    weight_done: weightDone,
    rpe: null,
    completed_at: startedAt,
  });
  return session.id;
}

describe('PlateauDetectionService', () => {
  it('détecte un plateau quand même poids sur 3 séances consécutives', async () => {
    const { setLogRepo, sessionLogRepo, service, exerciseId } = await makeCtx();
    await addCompletedSession(sessionLogRepo, setLogRepo, exerciseId, '2026-01-01T10:00:00Z', 60);
    await addCompletedSession(sessionLogRepo, setLogRepo, exerciseId, '2026-01-03T10:00:00Z', 60);
    const id3 = await addCompletedSession(sessionLogRepo, setLogRepo, exerciseId, '2026-01-05T10:00:00Z', 60);

    const result = await service.detectPlateaus(id3);
    expect(result).toHaveLength(1);
    expect(result[0].exerciseId).toBe(1);
    expect(result[0].exerciseName).toBe('Développé couché');
    expect(result[0].currentWeight).toBe(60);
    expect(result[0].sessionsCount).toBe(3);
  });

  it('ne détecte pas de plateau si moins de 3 séances complétées', async () => {
    const { setLogRepo, sessionLogRepo, service, exerciseId } = await makeCtx();
    await addCompletedSession(sessionLogRepo, setLogRepo, exerciseId, '2026-01-01T10:00:00Z', 60);
    const id2 = await addCompletedSession(sessionLogRepo, setLogRepo, exerciseId, '2026-01-03T10:00:00Z', 60);

    const result = await service.detectPlateaus(id2);
    expect(result).toHaveLength(0);
  });

  it('ne détecte pas de plateau si le poids a progressé sur la 2e séance', async () => {
    const { setLogRepo, sessionLogRepo, service, exerciseId } = await makeCtx();
    await addCompletedSession(sessionLogRepo, setLogRepo, exerciseId, '2026-01-01T10:00:00Z', 60);
    await addCompletedSession(sessionLogRepo, setLogRepo, exerciseId, '2026-01-03T10:00:00Z', 62.5);
    const id3 = await addCompletedSession(sessionLogRepo, setLogRepo, exerciseId, '2026-01-05T10:00:00Z', 60);

    const result = await service.detectPlateaus(id3);
    expect(result).toHaveLength(0);
  });

  it('exclut les séances abandonnées du comptage', async () => {
    const { setLogRepo, sessionLogRepo, service, exerciseId } = await makeCtx();
    await addCompletedSession(sessionLogRepo, setLogRepo, exerciseId, '2026-01-01T10:00:00Z', 60);

    const abandoned = await sessionLogRepo.save({
      workout_id: WORKOUT_ID,
      started_at: '2026-01-02T10:00:00Z',
      checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null,
    });
    await sessionLogRepo.abandon(abandoned.id, '2026-01-02T11:00:00Z');
    await setLogRepo.save({
      session_log_id: abandoned.id, set_id: 1, exercise_id: exerciseId,
      reps_done: 5, weight_done: 60, rpe: null, completed_at: '2026-01-02T10:00:00Z',
    });

    const id3 = await addCompletedSession(sessionLogRepo, setLogRepo, exerciseId, '2026-01-03T10:00:00Z', 60);
    const result = await service.detectPlateaus(id3);
    expect(result).toHaveLength(0);
  });

  it('ignore les exercices bodyweight (weight_done = 0)', async () => {
    const { setLogRepo, sessionLogRepo, service, exerciseId } = await makeCtx();
    await addCompletedSession(sessionLogRepo, setLogRepo, exerciseId, '2026-01-01T10:00:00Z', 0);
    await addCompletedSession(sessionLogRepo, setLogRepo, exerciseId, '2026-01-03T10:00:00Z', 0);
    const id3 = await addCompletedSession(sessionLogRepo, setLogRepo, exerciseId, '2026-01-05T10:00:00Z', 0);

    const result = await service.detectPlateaus(id3);
    expect(result).toHaveLength(0);
  });

  it('retourne [] si sessionLogId inconnu', async () => {
    const { service } = await makeCtx();
    const result = await service.detectPlateaus(999);
    expect(result).toHaveLength(0);
  });
});
