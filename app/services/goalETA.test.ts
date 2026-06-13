import { computeETA } from './goalETA';

function makeSession(startIso: string, dayOffset: number, weight: number) {
  const d = new Date(startIso);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  return { date: d.toISOString(), weight };
}

const START = '2026-01-01T10:00:00.000Z';
const TODAY = new Date('2026-03-01T12:00:00.000Z');

describe('computeETA', () => {
  it('retourne no_data si sessions vides', () => {
    expect(computeETA([], 100, undefined, TODAY).status).toBe('no_data');
  });

  it('retourne no_data si moins de 3 sessions', () => {
    const sessions = [makeSession(START, 0, 60), makeSession(START, 7, 62)];
    expect(computeETA(sessions, 100, undefined, TODAY).status).toBe('no_data');
  });

  it('retourne achieved si dernière session weight >= target', () => {
    const sessions = [
      makeSession(START, 0, 60),
      makeSession(START, 7, 80),
      makeSession(START, 14, 100),
    ];
    expect(computeETA(sessions, 100, undefined, TODAY).status).toBe('achieved');
  });

  it('retourne stagnant si pente <= 0 (même poids)', () => {
    const sessions = Array.from({ length: 5 }, (_, i) => makeSession(START, i * 7, 80));
    expect(computeETA(sessions, 100, undefined, TODAY).status).toBe('stagnant');
  });

  it('retourne on_track avec etaDate et ratePerWeek pour progression régulière', () => {
    // +2kg par semaine sur 8 séances : 60, 62, 64, ..., 74
    const sessions = Array.from({ length: 8 }, (_, i) => makeSession(START, i * 7, 60 + i * 2));
    const result = computeETA(sessions, 84, undefined, TODAY);
    expect(result.status).toBe('on_track');
    if (result.status !== 'on_track') return;
    expect(result.ratePerWeek).toBeCloseTo(2, 1);
    expect(result.etaDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(result.etaDate) > TODAY).toBe(true);
  });

  it('inclut projectedAtTargetDate si targetDate fournie', () => {
    const sessions = Array.from({ length: 8 }, (_, i) => makeSession(START, i * 7, 60 + i * 2));
    // targetDate = 2026-04-01 = 90 jours depuis START
    // projection = 60 + (2/7)*90 ≈ 85.7
    const result = computeETA(sessions, 84, '2026-04-01', TODAY);
    expect(result.status).toBe('on_track');
    if (result.status !== 'on_track') return;
    expect(result.projectedAtTargetDate).toBeDefined();
    expect(result.projectedAtTargetDate!).toBeCloseTo(85.7, 0);
  });

  it('calcule correctement avec exactement 12 sessions', () => {
    // 12 séances +1kg/sem
    const sessions = Array.from({ length: 12 }, (_, i) => makeSession(START, i * 7, 60 + i));
    const result = computeETA(sessions, 80, undefined, TODAY);
    expect(result.status).toBe('on_track');
    if (result.status !== 'on_track') return;
    expect(result.ratePerWeek).toBeCloseTo(1, 1);
  });
});
