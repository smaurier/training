import type { SetLog } from '../db/types';

export type CreateSetLogDto = Omit<SetLog, 'id'>;

export interface ISetLogRepository {
  save(dto: CreateSetLogDto): Promise<SetLog>;
  findBySessionLogId(sessionLogId: number): Promise<SetLog[]>;
  findBySetId(setId: number): Promise<SetLog[]>;
  countBySessionLogIds(ids: number[]): Promise<Record<number, number>>;
  findByExerciseId(exerciseId: number): Promise<SetLog[]>;
  findFromDate(from: string): Promise<SetLog[]>;
  findDistinctExerciseIds(): Promise<number[]>;
}
