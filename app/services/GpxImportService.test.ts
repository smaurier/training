import { haversine } from './GpxImportService';

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
