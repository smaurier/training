import { XMLParser } from 'fast-xml-parser';
import type { IProgramRepository } from '../repositories/IProgramRepository';
import type { IWorkoutRepository } from '../repositories/IWorkoutRepository';
import type { IExerciseRepository } from '../repositories/IExerciseRepository';
import type { IWorkoutExerciseRepository } from '../repositories/IWorkoutExerciseRepository';
import type { IBlockRepository } from '../repositories/IBlockRepository';
import type { ISetRepository } from '../repositories/ISetRepository';
import type { ISessionLogRepository } from '../repositories/ISessionLogRepository';
import type { ISetLogRepository } from '../repositories/ISetLogRepository';

export interface GpxData {
  startedAt: string;
  durationSeconds: number;
  distanceMeters: number;
  points: [number, number][];
}

export function haversine(points: [number, number][]): number {
  const R = 6371000;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const lat1 = (points[i - 1][0] * Math.PI) / 180;
    const lat2 = (points[i][0] * Math.PI) / 180;
    const lon1 = (points[i - 1][1] * Math.PI) / 180;
    const lon2 = (points[i][1] * Math.PI) / 180;
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return Math.round(total);
}

export function parseGpxFile(xmlContent: string): GpxData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    isArray: (name) => name === 'trkpt' || name === 'trkseg',
  });
  const result = parser.parse(xmlContent);
  const trksegs: unknown[] = result?.gpx?.trk?.trkseg ?? [];
  const rawPoints: { lat: number; lon: number; time: string }[] = (trksegs as { trkpt?: unknown[] }[])
    .flatMap(seg => (seg.trkpt ?? []) as { lat: number; lon: number; time: string }[]);

  if (rawPoints.length === 0) throw new Error('Aucun trackpoint trouvé dans le fichier GPX');

  rawPoints.sort((a, b) => a.time.localeCompare(b.time));

  const first = rawPoints[0];
  const last = rawPoints[rawPoints.length - 1];
  const durationSeconds = rawPoints.length > 1
    ? Math.round((Date.parse(last.time) - Date.parse(first.time)) / 1000)
    : 0;
  const points: [number, number][] = rawPoints.map(p => [Number(p.lat), Number(p.lon)]);
  const distanceMeters = haversine(points);

  return { startedAt: first.time, durationSeconds, distanceMeters, points };
}

export class GpxImportService {
  constructor(
    private readonly programRepo: IProgramRepository,
    private readonly workoutRepo: IWorkoutRepository,
    private readonly exerciseRepo: IExerciseRepository,
    private readonly weRepo: IWorkoutExerciseRepository,
    private readonly blockRepo: IBlockRepository,
    private readonly setRepo: ISetRepository,
    private readonly sessionLogRepo: ISessionLogRepository,
    private readonly setLogRepo: ISetLogRepository,
  ) {}

  private async findOrCreateFootingSetup(): Promise<{ workoutId: number; exerciseId: number; setId: number }> {
    // 1. Program
    const programs = await this.programRepo.findAll();
    let program = programs.find(p => p.name === 'Activités libres') ?? null;
    if (!program) {
      program = await this.programRepo.save({ name: 'Activités libres', description: null, is_active: 1 });
    }

    // 2. Workout
    const workouts = await this.workoutRepo.findByProgramId(program.id);
    let workout = workouts.find(w => w.name === 'Sorties libres') ?? null;
    if (!workout) {
      workout = await this.workoutRepo.save({ program_id: program.id, name: 'Sorties libres', order_index: 0 });
    }

    // 3. Exercise
    let exercise = await this.exerciseRepo.findByName('Course à pied');
    if (!exercise) {
      exercise = await this.exerciseRepo.save({
        name: 'Course à pied',
        type: 'cardio',
        muscle_groups: '[]',
        technical_notes: null,
        description: null,
        is_custom: 0,
        progression_step: 0,
        progression_threshold: 1,
      });
    }

    // 4. WorkoutExercise
    const wes = await this.weRepo.findByWorkoutId(workout.id);
    let we = wes.find(w => w.exercise_id === exercise!.id) ?? null;
    if (!we) {
      we = await this.weRepo.save({ workout_id: workout.id, exercise_id: exercise.id, order_index: 0 });
    }

    // 5. Block
    const blocks = await this.blockRepo.findByWorkoutExerciseId(we.id);
    let block = blocks[0] ?? null;
    if (!block) {
      block = await this.blockRepo.save({ workout_exercise_id: we.id, name: 'Cardio', order_index: 0, is_work_block: 0 });
    }

    // 6. Set
    const sets = await this.setRepo.findByBlockId(block.id);
    let set = sets[0] ?? null;
    if (!set) {
      set = await this.setRepo.save({
        block_id: block.id,
        reps_min: 0,
        weight: null,
        weight_type: 'bodyweight',
        rest_duration: 0,
        order_index: 0,
      });
    }

    return { workoutId: workout.id, exerciseId: exercise.id, setId: set.id };
  }
}
