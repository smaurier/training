import type { SQLiteDatabase } from 'expo-sqlite';
import type { IBodyMeasurementRepository } from './IBodyMeasurementRepository';
import type { BodyMeasurement, CreateBodyMeasurementDto } from '../db/types';

export class SQLiteBodyMeasurementRepository implements IBodyMeasurementRepository {
  constructor(private db: SQLiteDatabase) {}

  async save(dto: CreateBodyMeasurementDto): Promise<BodyMeasurement> {
    await this.db.runAsync(
      `INSERT INTO body_measurements (date, weight_kg, waist_cm, arm_cm, thigh_cm, hip_cm)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         weight_kg = excluded.weight_kg,
         waist_cm  = excluded.waist_cm,
         arm_cm    = excluded.arm_cm,
         thigh_cm  = excluded.thigh_cm,
         hip_cm    = excluded.hip_cm`,
      [dto.date, dto.weight_kg, dto.waist_cm, dto.arm_cm, dto.thigh_cm, dto.hip_cm],
    );
    const row = await this.db.getFirstAsync<BodyMeasurement>(
      'SELECT * FROM body_measurements WHERE date = ?',
      [dto.date],
    );
    return row!;
  }

  async getHistory(limit?: number): Promise<BodyMeasurement[]> {
    const sql = limit !== undefined
      ? 'SELECT * FROM body_measurements ORDER BY date DESC LIMIT ?'
      : 'SELECT * FROM body_measurements ORDER BY date DESC';
    const params = limit !== undefined ? [limit] : [];
    return this.db.getAllAsync<BodyMeasurement>(sql, params);
  }

  async getLatest(): Promise<BodyMeasurement | null> {
    return (await this.db.getFirstAsync<BodyMeasurement>(
      'SELECT * FROM body_measurements ORDER BY date DESC LIMIT 1',
    )) ?? null;
  }
}
