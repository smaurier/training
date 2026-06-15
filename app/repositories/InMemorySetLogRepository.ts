import type { SetLog } from '../db/types';
import { ISetLogRepository, CreateSetLogDto } from './ISetLogRepository';

export class InMemorySetLogRepository implements ISetLogRepository {
  private items: SetLog[] = [];
  private nextId = 1;

  async save(dto: CreateSetLogDto): Promise<SetLog> {
    const item: SetLog = { ...dto, id: this.nextId++, duration_seconds: dto.duration_seconds ?? null, distance_meters: dto.distance_meters ?? null };
    this.items.push(item);
    return item;
  }

  async findBySessionLogId(sessionLogId: number): Promise<SetLog[]> {
    return this.items.filter(i => i.session_log_id === sessionLogId);
  }

  async findBySetId(setId: number): Promise<SetLog[]> {
    return this.items
      .filter(i => i.set_id === setId)
      .sort((a, b) => b.completed_at.localeCompare(a.completed_at));
  }

  async countBySessionLogIds(ids: number[]): Promise<Record<number, number>> {
    if (ids.length === 0) return {};
    const result: Record<number, number> = {};
    for (const item of this.items) {
      if (ids.includes(item.session_log_id)) {
        result[item.session_log_id] = (result[item.session_log_id] ?? 0) + 1;
      }
    }
    return result;
  }

  async findByExerciseId(exerciseId: number): Promise<SetLog[]> {
    return this.items
      .filter(i => i.exercise_id === exerciseId)
      .sort((a, b) => a.completed_at.localeCompare(b.completed_at));
  }

  async findFromDate(from: string): Promise<SetLog[]> {
    return this.items
      .filter(i => i.completed_at >= from)
      .sort((a, b) => a.completed_at.localeCompare(b.completed_at));
  }

  async findDistinctExerciseIds(): Promise<number[]> {
    return [...new Set(this.items.map(i => i.exercise_id))];
  }

  async deleteBySetAndSession(setId: number, sessionLogId: number): Promise<void> {
    this.items = this.items.filter(
      i => !(i.set_id === setId && i.session_log_id === sessionLogId)
    );
  }

  async updateCardioData(
    id: number,
    duration_seconds: number | null,
    distance_meters: number | null,
    rpe: number | null,
  ): Promise<void> {
    const item = this.items.find(s => s.id === id);
    if (item) {
      item.duration_seconds = duration_seconds;
      item.distance_meters = distance_meters;
      item.rpe = rpe;
    }
  }
}
