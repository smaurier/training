import { SQLiteDatabase } from 'expo-sqlite';
import { Program } from '../db/types';
import { IProgramRepository, CreateProgramDto, UpdateProgramDto } from './IProgramRepository';

export class SQLiteProgramRepository implements IProgramRepository {
  constructor(private db: SQLiteDatabase) {}

  async findAll(): Promise<Program[]> {
    return this.db.getAllAsync<Program>('SELECT * FROM programs ORDER BY created_at DESC');
  }

  async findById(id: number): Promise<Program | null> {
    return this.db.getFirstAsync<Program>(
      'SELECT * FROM programs WHERE id = ?',
      [id]
    );
  }

  async save(dto: CreateProgramDto): Promise<Program> {
    const result = await this.db.runAsync(
      `INSERT INTO programs (name, description, is_active) VALUES (?, ?, ?)`,
      [dto.name, dto.description ?? null, dto.is_active]
    );
    const saved = await this.findById(result.lastInsertRowId);
    if (!saved) throw new Error(`Programme ${result.lastInsertRowId} introuvable après insertion`);
    return saved;
  }

  async update(id: number, dto: UpdateProgramDto): Promise<Program> {
    await this.db.runAsync(
      `UPDATE programs SET name = ?, description = ?, is_active = ? WHERE id = ?`,
      [dto.name, dto.description ?? null, dto.is_active, id]
    );
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Programme ${id} introuvable`);
    return updated;
  }

  async delete(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM programs WHERE id = ?', [id]);
  }
}
