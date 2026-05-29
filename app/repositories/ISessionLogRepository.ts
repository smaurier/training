import type { SessionLog } from '../db/types';

export type CreateSessionLogDto = Omit<SessionLog, 'id' | 'ended_at'>;

export interface ISessionLogRepository {
  save(dto: CreateSessionLogDto): Promise<SessionLog>;
  findById(id: number): Promise<SessionLog | null>;
  findByWorkoutId(workoutId: number): Promise<SessionLog[]>;
  findLatestByWorkoutIds(workoutIds: number[]): Promise<SessionLog | null>;
  complete(id: number, endedAt: string): Promise<void>;
}
