import { BodyMeasurementService } from './BodyMeasurementService';
import { InMemoryBodyMeasurementRepository } from '../repositories/InMemoryBodyMeasurementRepository';

function make() {
  return new BodyMeasurementService(new InMemoryBodyMeasurementRepository());
}

describe('BodyMeasurementService', () => {
  it('save délègue au repo', async () => {
    const svc = make();
    const result = await svc.save({ date: '2026-06-01', weight_kg: 75, waist_cm: null, arm_cm: null, thigh_cm: null, hip_cm: null });
    expect(result.weight_kg).toBe(75);
  });

  it('save avec valeurs partielles (champs null)', async () => {
    const svc = make();
    const result = await svc.save({ date: '2026-06-01', weight_kg: null, waist_cm: 80, arm_cm: null, thigh_cm: null, hip_cm: null });
    expect(result.waist_cm).toBe(80);
    expect(result.weight_kg).toBeNull();
  });

  it('getHistory retourne les mesures triées DESC', async () => {
    const svc = make();
    await svc.save({ date: '2026-06-01', weight_kg: 75, waist_cm: null, arm_cm: null, thigh_cm: null, hip_cm: null });
    await svc.save({ date: '2026-06-08', weight_kg: 74.5, waist_cm: null, arm_cm: null, thigh_cm: null, hip_cm: null });
    const history = await svc.getHistory();
    expect(history[0].date).toBe('2026-06-08');
  });

  it('getLatest retourne null sans données', async () => {
    expect(await make().getLatest()).toBeNull();
  });
});
