import { haversine, parseGpxFile } from './GpxImportService';

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
