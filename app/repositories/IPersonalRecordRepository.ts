import type { PersonalRecord } from '../db/types';

export type CreatePersonalRecordDto = Omit<PersonalRecord, 'id'>;

export interface IPersonalRecordRepository {
  save(dto: CreatePersonalRecordDto): Promise<PersonalRecord>;
  findBestByExerciseId(exerciseId: number): Promise<PersonalRecord | null>;
  findAllByExerciseId(exerciseId: number): Promise<PersonalRecord[]>;
  findRecent(limit: number): Promise<PersonalRecord[]>;
  deleteBySessionLogId(sessionLogId: number): Promise<void>;
}
