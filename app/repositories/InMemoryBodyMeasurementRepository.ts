import type { IBodyMeasurementRepository } from './IBodyMeasurementRepository';
import type { BodyMeasurement, CreateBodyMeasurementDto } from '../db/types';

export class InMemoryBodyMeasurementRepository implements IBodyMeasurementRepository {
  private records: BodyMeasurement[] = [];
  private nextId = 1;

  async save(dto: CreateBodyMeasurementDto): Promise<BodyMeasurement> {
    const existing = this.records.findIndex(r => r.date === dto.date);
    const record: BodyMeasurement = {
      id: existing !== -1 ? this.records[existing].id : this.nextId++,
      date: dto.date,
      weight_kg: dto.weight_kg,
      waist_cm: dto.waist_cm,
      arm_cm: dto.arm_cm,
      thigh_cm: dto.thigh_cm,
      hip_cm: dto.hip_cm,
      created_at: new Date().toISOString(),
    };
    if (existing !== -1) {
      this.records[existing] = record;
    } else {
      this.records.push(record);
    }
    return record;
  }

  async getHistory(limit?: number): Promise<BodyMeasurement[]> {
    const sorted = [...this.records].sort((a, b) => b.date.localeCompare(a.date));
    return limit !== undefined ? sorted.slice(0, limit) : sorted;
  }

  async getLatest(): Promise<BodyMeasurement | null> {
    if (this.records.length === 0) return null;
    return [...this.records].sort((a, b) => b.date.localeCompare(a.date))[0];
  }
}
