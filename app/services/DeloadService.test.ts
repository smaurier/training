import { DeloadService, applyDeloadToExercises } from './DeloadService';
import { InMemorySettingsRepository } from '../repositories/InMemorySettingsRepository';
import { InMemorySessionLogRepository } from '../repositories/InMemorySessionLogRepository';

const WORKOUT_ID = 1;

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

async function makeService(overrides?: {
  lastDeloadAt?: string;
  deloadWeeks?: string;
}) {
  const settingsRepo = new InMemorySettingsRepository();
  const sessionLogRepo = new InMemorySessionLogRepository();
  if (overrides?.lastDeloadAt) {
    await settingsRepo.set('last_deload_at', overrides.lastDeloadAt);
  }
  if (overrides?.deloadWeeks) {
    await settingsRepo.set('deload_weeks', overrides.deloadWeeks);
  }
  return { service: new DeloadService(settingsRepo, sessionLogRepo), settingsRepo, sessionLogRepo };
}

describe('DeloadService — shouldSuggestDeload', () => {
  it('retourne false si aucune séance et aucune décharge', async () => {
    const { service } = await makeService();
    expect(await service.shouldSuggestDeload(WORKOUT_ID)).toBe(false);
  });

  it('retourne false si première séance il y a moins de 4 semaines (27 jours)', async () => {
    const { service, sessionLogRepo } = await makeService();
    const s = await sessionLogRepo.save({
      workout_id: WORKOUT_ID, started_at: daysAgo(27),
      checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null,
    });
    await sessionLogRepo.complete(s.id, daysAgo(27));
    expect(await service.shouldSuggestDeload(WORKOUT_ID)).toBe(false);
  });

  it('retourne true si première séance il y a 28+ jours et aucune décharge', async () => {
    const { service, sessionLogRepo } = await makeService();
    const s = await sessionLogRepo.save({
      workout_id: WORKOUT_ID, started_at: daysAgo(28),
      checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null,
    });
    await sessionLogRepo.complete(s.id, daysAgo(28));
    expect(await service.shouldSuggestDeload(WORKOUT_ID)).toBe(true);
  });

  it('retourne false si dernière décharge il y a 27 jours', async () => {
    const { service } = await makeService({ lastDeloadAt: daysAgo(27) });
    expect(await service.shouldSuggestDeload(WORKOUT_ID)).toBe(false);
  });

  it('retourne true si dernière décharge il y a 28+ jours', async () => {
    const { service } = await makeService({ lastDeloadAt: daysAgo(28) });
    expect(await service.shouldSuggestDeload(WORKOUT_ID)).toBe(true);
  });

  it('respecte deload_weeks personnalisé (6 semaines = 42 jours)', async () => {
    const { service } = await makeService({ lastDeloadAt: daysAgo(35), deloadWeeks: '6' });
    expect(await service.shouldSuggestDeload(WORKOUT_ID)).toBe(false);
  });

  it('retourne true avec deload_weeks=6 si dernière décharge il y a 42+ jours', async () => {
    const { service } = await makeService({ lastDeloadAt: daysAgo(42), deloadWeeks: '6' });
    expect(await service.shouldSuggestDeload(WORKOUT_ID)).toBe(true);
  });

  it('utilise la séance la plus ancienne si aucune décharge enregistrée', async () => {
    const { service, sessionLogRepo } = await makeService();
    const s1 = await sessionLogRepo.save({
      workout_id: WORKOUT_ID, started_at: daysAgo(30),
      checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null,
    });
    await sessionLogRepo.complete(s1.id, daysAgo(30));
    const s2 = await sessionLogRepo.save({
      workout_id: WORKOUT_ID, started_at: daysAgo(5),
      checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null,
    });
    await sessionLogRepo.complete(s2.id, daysAgo(5));
    expect(await service.shouldSuggestDeload(WORKOUT_ID)).toBe(true);
  });

  it('ignore les séances abandonnées pour la date de référence', async () => {
    const { service, sessionLogRepo } = await makeService();
    const s1 = await sessionLogRepo.save({
      workout_id: WORKOUT_ID, started_at: daysAgo(30),
      checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null,
    });
    await sessionLogRepo.abandon(s1.id, daysAgo(30));
    const s2 = await sessionLogRepo.save({
      workout_id: WORKOUT_ID, started_at: daysAgo(5),
      checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null,
    });
    await sessionLogRepo.complete(s2.id, daysAgo(5));
    expect(await service.shouldSuggestDeload(WORKOUT_ID)).toBe(false);
  });
});

describe('DeloadService — recordDeload', () => {
  it('enregistre last_deload_at dans settings', async () => {
    const { service, settingsRepo } = await makeService();
    const now = new Date().toISOString();
    await service.recordDeload(now);
    expect(await settingsRepo.get('last_deload_at')).toBe(now);
  });

  it('écrase la valeur précédente (idempotent)', async () => {
    const { service, settingsRepo } = await makeService();
    await service.recordDeload('2026-01-01T00:00:00.000Z');
    const later = new Date().toISOString();
    await service.recordDeload(later);
    expect(await settingsRepo.get('last_deload_at')).toBe(later);
  });
});

describe('DeloadService — getDeloadWeeks', () => {
  it('retourne 4 par défaut', async () => {
    const { service } = await makeService();
    expect(await service.getDeloadWeeks()).toBe(4);
  });

  it('retourne la valeur configurée', async () => {
    const { service } = await makeService({ deloadWeeks: '6' });
    expect(await service.getDeloadWeeks()).toBe(6);
  });

  it('retourne 4 si la valeur stockée est invalide', async () => {
    const settingsRepo = new InMemorySettingsRepository();
    const sessionLogRepo = new InMemorySessionLogRepository();
    await settingsRepo.set('deload_weeks', 'abc');
    const service = new DeloadService(settingsRepo, sessionLogRepo);
    expect(await service.getDeloadWeeks()).toBe(4);
  });
});

describe('applyDeloadToExercises', () => {
  it('réduit le poids des séries fixed de 10% arrondi au multiple de 2', () => {
    const exercises = [{
      id: 1, workout_id: 1, order_index: 0,
      exercise: { id: 10, name: 'Squat', type: 'musculation' as const, technical_notes: null, muscle_groups: '[]', description: null },
      blocks: [{
        id: 1, name: 'Travail', order_index: 0, is_work_block: 1 as const,
        sets: [{ id: 1, block_id: 1, order_index: 0, reps_min: 5, rest_duration: 120, weight: 100, weight_type: 'fixed' as const, duration_seconds: null, weight_ratio: null }],
      }],
    }];
    const result = applyDeloadToExercises(exercises);
    // applyDeload(100) = Math.floor(100 * 0.9 / 2) * 2 = Math.floor(45) * 2 = 90
    expect(result[0].blocks[0].sets[0].weight).toBe(90);
  });

  it('ne modifie pas les séries bodyweight', () => {
    const exercises = [{
      id: 1, workout_id: 1, order_index: 0,
      exercise: { id: 10, name: 'Traction', type: 'musculation' as const, technical_notes: null, muscle_groups: '[]', description: null },
      blocks: [{
        id: 1, name: 'Travail', order_index: 0, is_work_block: 1 as const,
        sets: [{ id: 1, block_id: 1, order_index: 0, reps_min: 8, rest_duration: 120, weight: 0, weight_type: 'bodyweight' as const, duration_seconds: null, weight_ratio: null }],
      }],
    }];
    const result = applyDeloadToExercises(exercises);
    expect(result[0].blocks[0].sets[0].weight).toBe(0);
  });

  it('passe les poids null inchangés', () => {
    const exercises = [{
      id: 1, workout_id: 1, order_index: 0,
      exercise: { id: 10, name: 'Squat', type: 'musculation' as const, technical_notes: null, muscle_groups: '[]', description: null },
      blocks: [{
        id: 1, name: 'Travail', order_index: 0, is_work_block: 1 as const,
        sets: [{ id: 1, block_id: 1, order_index: 0, reps_min: 5, rest_duration: 120, weight: null, weight_type: 'fixed' as const, duration_seconds: null, weight_ratio: null }],
      }],
    }];
    const result = applyDeloadToExercises(exercises);
    expect(result[0].blocks[0].sets[0].weight).toBeNull();
  });
});
