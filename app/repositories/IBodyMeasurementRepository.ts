import type { BodyMeasurement, CreateBodyMeasurementDto } from '../db/types';

export interface IBodyMeasurementRepository {
  save(dto: CreateBodyMeasurementDto): Promise<BodyMeasurement>;   // upsert par date
  getHistory(limit?: number): Promise<BodyMeasurement[]>;          // DESC par date
  getLatest(): Promise<BodyMeasurement | null>;
}
