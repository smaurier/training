import type { SetLog } from '../db/types';
import { ISetLogRepository, CreateSetLogDto } from './ISetLogRepository';

export class InMemorySetLogRepository implements ISetLogRepository {
  private items: SetLog[] = [];
  private nextId = 1;

  async save(dto: CreateSetLogDto): Promise<SetLog> {
    const item: SetLog = { ...dto, id: this.nextId++ };
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
}
