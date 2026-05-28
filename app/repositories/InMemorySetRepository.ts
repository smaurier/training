import type { Set as TrainingSet } from '../db/types';
import { ISetRepository, CreateSetDto, UpdateSetDto } from './ISetRepository';

export class InMemorySetRepository implements ISetRepository {
  private items: TrainingSet[] = [];
  private nextId = 1;

  async findByBlockId(blockId: number): Promise<TrainingSet[]> {
    return this.items.filter(i => i.block_id === blockId);
  }

  async findById(id: number): Promise<TrainingSet | null> {
    return this.items.find(i => i.id === id) ?? null;
  }

  async save(dto: CreateSetDto): Promise<TrainingSet> {
    const item: TrainingSet = { ...dto, id: this.nextId++ };
    this.items.push(item);
    return item;
  }

  async update(id: number, dto: UpdateSetDto): Promise<TrainingSet> {
    const idx = this.items.findIndex(i => i.id === id);
    if (idx === -1) throw new Error(`Set ${id} introuvable`);
    this.items[idx] = { ...this.items[idx], ...dto };
    return this.items[idx];
  }

  async delete(id: number): Promise<void> {
    this.items = this.items.filter(i => i.id !== id);
  }
}
