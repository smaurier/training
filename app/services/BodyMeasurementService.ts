import type { IBodyMeasurementRepository } from '../repositories/IBodyMeasurementRepository';
import type { BodyMeasurement, CreateBodyMeasurementDto } from '../db/types';

export class BodyMeasurementService {
  constructor(private repo: IBodyMeasurementRepository) {}

  save(dto: CreateBodyMeasurementDto): Promise<BodyMeasurement> {
    return this.repo.save(dto);
  }

  getHistory(limit?: number): Promise<BodyMeasurement[]> {
    return this.repo.getHistory(limit);
  }

  getLatest(): Promise<BodyMeasurement | null> {
    return this.repo.getLatest();
  }
}
