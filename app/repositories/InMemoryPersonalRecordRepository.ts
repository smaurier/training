import type { PersonalRecord } from '../db/types';
import { IPersonalRecordRepository, CreatePersonalRecordDto } from './IPersonalRecordRepository';

export class InMemoryPersonalRecordRepository implements IPersonalRecordRepository {
  private items: PersonalRecord[] = [];
  private nextId = 1;

  async save(dto: CreatePersonalRecordDto): Promise<PersonalRecord> {
    const item: PersonalRecord = { ...dto, id: this.nextId++ };
    this.items.push(item);
    return item;
  }

  async findBestByExerciseId(exerciseId: number): Promise<PersonalRecord | null> {
    const matching = this.items
      .filter(i => i.exercise_id === exerciseId)
      .sort((a, b) => b.estimated_1rm - a.estimated_1rm);
    return matching[0] ?? null;
  }
}
