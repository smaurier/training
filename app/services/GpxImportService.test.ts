import { haversine, parseGpxFile, GpxImportService } from './GpxImportService';
import { InMemoryProgramRepository } from '../repositories/InMemoryProgramRepository';
import { InMemoryWorkoutRepository } from '../repositories/InMemoryWorkoutRepository';
import { InMemoryExerciseRepository } from '../repositories/InMemoryExerciseRepository';
import { InMemoryWorkoutExerciseRepository } from '../repositories/InMemoryWorkoutExerciseRepository';
import { InMemoryBlockRepository } from '../repositories/InMemoryBlockRepository';
import { InMemorySetRepository } from '../repositories/InMemorySetRepository';
import { InMemorySessionLogRepository } from '../repositories/InMemorySessionLogRepository';
import { InMemorySetLogRepository } from '../repositories/InMemorySetLogRepository';

function makeGpxService() {
  const programRepo = new InMemoryProgramRepository();
  const workoutRepo = new InMemoryWorkoutRepository();
  const exerciseRepo = new InMemoryExerciseRepository();
  const weRepo = new InMemoryWorkoutExerciseRepository();
  const blockRepo = new InMemoryBlockRepository();
  const setRepo = new InMemorySetRepository();
  const sessionLogRepo = new InMemorySessionLogRepository();
  const setLogRepo = new InMemorySetLogRepository();
  const service = new GpxImportService(
    programRepo, workoutRepo, exerciseRepo, weRepo,
    blockRepo, setRepo, sessionLogRepo, setLogRepo,
  );
  return { service, programRepo, workoutRepo, exerciseRepo, weRepo, blockRepo, setRepo, sessionLogRepo, setLogRepo };
}

const GPX_MINIMAL = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="0" lon="0"><time>2026-01-01T08:00:00Z</time></trkpt>
      <trkpt lat="1" lon="0"><time>2026-01-01T08:30:00Z</time></trkpt>
    </trkseg>
  </trk>
</gpx>`;

const GPX_SINGLE_POINT = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk><trkseg>
    <trkpt lat="48.8566" lon="2.3522"><time>2026-06-01T07:00:00Z</time></trkpt>
  </trkseg></trk>
</gpx>`;

describe('haversine', () => {
  it('retourne 0 pour un seul point', () => {
    expect(haversine([[48.8566, 2.3522]])).toBe(0);
  });

  it('retourne 0 pour aucun point', () => {
    expect(haversine([])).toBe(0);
  });

  it('calcule ~111197m pour 1° de latitude (Nord/Sud)', () => {
    const d = haversine([[0, 0], [1, 0]]);
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112000);
  });

  it('somme les segments : aller-retour = double distance point-à-point', () => {
    const A: [number, number] = [0, 0];
    const B: [number, number] = [1, 0];
    const aller = haversine([A, B]);
    const allerRetour = haversine([A, B, A]);
    expect(allerRetour).toBeCloseTo(aller * 2, -2);
  });
});

describe('parseGpxFile', () => {
  it('extrait startedAt depuis le premier trackpoint', () => {
    const data = parseGpxFile(GPX_MINIMAL);
    expect(data.startedAt).toBe('2026-01-01T08:00:00Z');
  });

  it('calcule durationSeconds entre premier et dernier point', () => {
    const data = parseGpxFile(GPX_MINIMAL);
    expect(data.durationSeconds).toBe(30 * 60);
  });

  it('calcule distanceMeters via haversine', () => {
    const data = parseGpxFile(GPX_MINIMAL);
    expect(data.distanceMeters).toBeGreaterThan(110000);
    expect(data.distanceMeters).toBeLessThan(112000);
  });

  it('retourne les points sous forme [lat, lon][]', () => {
    const data = parseGpxFile(GPX_MINIMAL);
    expect(data.points).toHaveLength(2);
    expect(data.points[0]).toEqual([0, 0]);
    expect(data.points[1]).toEqual([1, 0]);
  });

  it('retourne durationSeconds = 0 et distance = 0 pour un seul point', () => {
    const data = parseGpxFile(GPX_SINGLE_POINT);
    expect(data.durationSeconds).toBe(0);
    expect(data.distanceMeters).toBe(0);
  });

  it('throw si aucun trackpoint', () => {
    const empty = `<?xml version="1.0"?><gpx version="1.1"><trk><trkseg></trkseg></trk></gpx>`;
    expect(() => parseGpxFile(empty)).toThrow('Aucun trackpoint trouvé');
  });
});

describe('GpxImportService.importGpx', () => {
  it('crée un session_log complété avec workout_id correct', async () => {
    const { service, sessionLogRepo } = makeGpxService();
    const { sessionLogId } = await service.importGpx(GPX_MINIMAL);
    const log = await sessionLogRepo.findById(sessionLogId);
    expect(log).not.toBeNull();
    expect(log!.status).toBe('completed');
    expect(log!.ended_at).not.toBeNull();
  });

  it('crée un set_log avec duration_seconds et distance_meters', async () => {
    const { service, setLogRepo } = makeGpxService();
    const { sessionLogId } = await service.importGpx(GPX_MINIMAL);
    const logs = await setLogRepo.findBySessionLogId(sessionLogId);
    expect(logs).toHaveLength(1);
    expect(logs[0].duration_seconds).toBe(30 * 60);
    expect(logs[0].distance_meters).toBeGreaterThan(110000);
  });

  it('réutilise le même workout si importGpx appelé deux fois', async () => {
    const { service, programRepo } = makeGpxService();
    await service.importGpx(GPX_MINIMAL);
    await service.importGpx(GPX_MINIMAL);
    expect(await programRepo.findAll()).toHaveLength(1);
  });

  it('started_at correspond au premier trackpoint', async () => {
    const { service, sessionLogRepo } = makeGpxService();
    const { sessionLogId } = await service.importGpx(GPX_MINIMAL);
    const log = await sessionLogRepo.findById(sessionLogId);
    expect(log!.started_at).toBe('2026-01-01T08:00:00Z');
  });
});

describe('GpxImportService.findOrCreateFootingSetup', () => {
  it('crée program + workout + exercise + we + block + set si tout absent', async () => {
    const { service, programRepo, workoutRepo, exerciseRepo } = makeGpxService();
    const { workoutId, exerciseId, setId } = await (service as any).findOrCreateFootingSetup();

    const programs = await programRepo.findAll();
    expect(programs).toHaveLength(1);
    expect(programs[0].name).toBe('Activités libres');

    const workouts = await workoutRepo.findByProgramId(programs[0].id);
    expect(workouts).toHaveLength(1);
    expect(workouts[0].name).toBe('Sorties libres');
    expect(workouts[0].id).toBe(workoutId);

    const ex = await exerciseRepo.findByName('Course à pied');
    expect(ex).not.toBeNull();
    expect(ex?.id).toBe(exerciseId);
    expect(ex?.type).toBe('cardio');

    expect(setId).toBeGreaterThan(0);
  });

  it('réutilise les structures existantes si déjà présentes', async () => {
    const { service, programRepo, workoutRepo } = makeGpxService();
    await (service as any).findOrCreateFootingSetup();
    await (service as any).findOrCreateFootingSetup();

    expect(await programRepo.findAll()).toHaveLength(1);
    const programs = await programRepo.findAll();
    const workouts = await workoutRepo.findByProgramId(programs[0].id);
    expect(workouts).toHaveLength(1);
  });
});
