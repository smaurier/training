import { ShareProgramService } from './ShareProgramService';
import { InMemoryProgramRepository } from '../repositories/InMemoryProgramRepository';
import { InMemoryWorkoutRepository } from '../repositories/InMemoryWorkoutRepository';
import { InMemoryWorkoutExerciseRepository } from '../repositories/InMemoryWorkoutExerciseRepository';
import { InMemoryBlockRepository } from '../repositories/InMemoryBlockRepository';
import { InMemorySetRepository } from '../repositories/InMemorySetRepository';
import { InMemoryExerciseRepository } from '../repositories/InMemoryExerciseRepository';

function makeService() {
  return new ShareProgramService(
    new InMemoryProgramRepository(),
    new InMemoryWorkoutRepository(),
    new InMemoryWorkoutExerciseRepository(),
    new InMemoryBlockRepository(),
    new InMemorySetRepository(),
    new InMemoryExerciseRepository(),
  );
}

describe('ShareProgramService — helpers purs', () => {
  const svc = makeService();

  it('compressPayload produit une chaîne base64 non vide', () => {
    const json = JSON.stringify({ v: 1, program: { name: 'Test' }, workouts: [] });
    const result = svc.compressPayload(json);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('decompressPayload est l\'inverse de compressPayload', () => {
    const json = JSON.stringify({ v: 1, program: { name: 'Test' }, workouts: [] });
    const compressed = svc.compressPayload(json);
    const restored = svc.decompressPayload(compressed);
    expect(restored).toBe(json);
  });

  it('compressPayload réduit la taille d\'un gros JSON', () => {
    const big = JSON.stringify({ v: 1, data: 'x'.repeat(1000) });
    const compressed = svc.compressPayload(big);
    expect(compressed.length).toBeLessThan(big.length);
  });
});
