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
    const item: TrainingSet = { ...dto, id: this.nextId++, duration_seconds: dto.duration_seconds ?? null };
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

  async swap(idA: number, idB: number): Promise<void> {
    const a = this.items.find(i => i.id === idA);
    const b = this.items.find(i => i.id === idB);
    if (!a || !b) throw new Error(`swap: id inconnu (${idA}, ${idB})`);
    const tmp = a.order_index;
    a.order_index = b.order_index;
    b.order_index = tmp;
  }
}
