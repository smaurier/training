import type { SessionLog } from '../db/types';
import { ISessionLogRepository, CreateSessionLogDto } from './ISessionLogRepository';

export class InMemorySessionLogRepository implements ISessionLogRepository {
  private items: SessionLog[] = [];
  private nextId = 1;

  async save(dto: CreateSessionLogDto): Promise<SessionLog> {
    const item: SessionLog = { ...dto, id: this.nextId++, ended_at: null };
    this.items.push(item);
    return item;
  }

  async findById(id: number): Promise<SessionLog | null> {
    return this.items.find(i => i.id === id) ?? null;
  }

  async findByWorkoutId(workoutId: number): Promise<SessionLog[]> {
    return this.items.filter(i => i.workout_id === workoutId);
  }

  async findLatestByWorkoutIds(workoutIds: number[]): Promise<SessionLog | null> {
    if (workoutIds.length === 0) return null;
    const matching = this.items
      .filter(i => workoutIds.includes(i.workout_id))
      .sort((a, b) => b.started_at.localeCompare(a.started_at));
    return matching[0] ?? null;
  }

  async complete(id: number, endedAt: string): Promise<void> {
    const item = this.items.find(i => i.id === id);
    if (item) item.ended_at = endedAt;
  }
}
