import { DeloadService } from './DeloadService';
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
});
