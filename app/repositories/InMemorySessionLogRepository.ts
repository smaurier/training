import type { SessionLog } from '../db/types';
import { ISessionLogRepository, CreateSessionLogDto } from './ISessionLogRepository';

export class InMemorySessionLogRepository implements ISessionLogRepository {
  private items: SessionLog[] = [];
  private nextId = 1;

  async save(dto: CreateSessionLogDto): Promise<SessionLog> {
    const item: SessionLog = {
      ...dto, id: this.nextId++, ended_at: null, status: 'active', paused_position: null,
    };
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

  async findLatestDatesPerWorkout(workoutIds: number[]): Promise<Map<number, string | null>> {
    const result = new Map<number, string | null>();
    for (const id of workoutIds) {
      const logs = this.items
        .filter(l => l.workout_id === id)
        .sort((a, b) => b.started_at.localeCompare(a.started_at));
      result.set(id, logs[0]?.started_at ?? null);
    }
    return result;
  }

  async complete(id: number, endedAt: string): Promise<void> {
    const item = this.items.find(i => i.id === id);
    if (item) { item.ended_at = endedAt; item.status = 'completed'; }
  }

  async pause(id: number, position: string): Promise<void> {
    const item = this.items.find(i => i.id === id);
    if (item) { item.status = 'paused'; item.paused_position = position; }
  }

  async abandon(id: number, endedAt: string): Promise<void> {
    const item = this.items.find(i => i.id === id);
    if (item) { item.status = 'abandoned'; item.ended_at = endedAt; }
  }

  async findAnyPaused(): Promise<SessionLog | null> {
    return this.items
      .filter(i => i.status === 'paused')
      .sort((a, b) => b.started_at.localeCompare(a.started_at))[0] ?? null;
  }

  async findAll(): Promise<SessionLog[]> {
    return [...this.items].sort((a, b) => b.started_at.localeCompare(a.started_at));
  }

  async getLastCompletedWorkoutId(workoutIds: number[]): Promise<number | null> {
    if (workoutIds.length === 0) return null;
    const row = this.items
      .filter(i => workoutIds.includes(i.workout_id) && i.ended_at !== null)
      .sort((a, b) => b.ended_at!.localeCompare(a.ended_at!))[0];
    return row?.workout_id ?? null;
  }
}
