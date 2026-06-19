import type { SessionLog } from '../db/types';
import type { SessionTagSlug } from '../services/sessionTagsUtils';

export type CreateSessionLogDto = Omit<SessionLog, 'id' | 'ended_at' | 'status' | 'paused_position' | 'mood_after' | 'tags'>;

export interface ISessionLogRepository {
  save(dto: CreateSessionLogDto): Promise<SessionLog>;
  findById(id: number): Promise<SessionLog | null>;
  findByWorkoutId(workoutId: number): Promise<SessionLog[]>;
  findLatestByWorkoutIds(workoutIds: number[]): Promise<SessionLog | null>;
  findLatestDatesPerWorkout(workoutIds: number[]): Promise<Map<number, string | null>>;
  complete(id: number, endedAt: string): Promise<void>;
  pause(id: number, position: string): Promise<void>;
  abandon(id: number, endedAt: string): Promise<void>;
  findAnyPaused(): Promise<SessionLog | null>;
  findAll(): Promise<SessionLog[]>;
  saveMoodAfter(id: number, mood: 1 | 2 | 3): Promise<void>;
  saveSessionMeta(id: number, tags: SessionTagSlug[], notes: string | null): Promise<void>;
  findMostRecent(): Promise<SessionLog | null>;
  delete(id: number): Promise<void>;
}
