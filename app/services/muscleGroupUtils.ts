import type { SetLog, Exercise } from '../db/types';

export type MacroCategory = 'Push' | 'Pull' | 'Jambes' | 'Gainage' | 'Autre';

export const MUSCLE_CATEGORY_MAP: Record<string, MacroCategory> = {
  'pectoraux': 'Push',
  'pectoraux supérieurs': 'Push',
  'triceps': 'Push',
  'deltoïdes antérieurs': 'Push',
  'deltoïdes': 'Push',
  'grand dorsal': 'Pull',
  'biceps': 'Pull',
  'brachial': 'Pull',
  'rhomboïdes': 'Pull',
  'trapèzes': 'Pull',
  'deltoïdes postérieurs': 'Pull',
  'rotateurs externes': 'Pull',
  'ischio-jambiers': 'Jambes',
  'fessiers': 'Jambes',
  'quadriceps': 'Jambes',
  'gastrocnémiens': 'Jambes',
  'soléaires': 'Jambes',
  'abdominaux': 'Gainage',
  'érecteurs du rachis': 'Gainage',
  'fléchisseurs de hanche': 'Gainage',
};

export interface MuscleDetail {
  muscle: string;
  volume: number;
}

export interface MacroGroupVolume {
  category: MacroCategory;
  volume: number;
  percentage: number;
  muscles: MuscleDetail[];
}

const MACRO_ORDER: MacroCategory[] = ['Push', 'Pull', 'Jambes', 'Gainage', 'Autre'];

export function getMacroCategory(muscle: string): MacroCategory {
  return MUSCLE_CATEGORY_MAP[muscle] ?? 'Autre';
}

export function computeVolumeByMuscleGroup(
  setLogs: SetLog[],
  exerciseMap: Map<number, Exercise>,
): MacroGroupVolume[] {
  const categoryVolume = new Map<MacroCategory, number>();
  const muscleVolume = new Map<string, number>();

  for (const log of setLogs) {
    const exercise = exerciseMap.get(log.exercise_id);
    if (!exercise) continue;

    let muscles: string[] = [];
    try {
      muscles = JSON.parse(exercise.muscle_groups) as string[];
    } catch {
      muscles = [];
    }
    if (muscles.length === 0) continue;

    const volume = log.reps_done * log.weight_done;
    const categories = new Set<MacroCategory>(muscles.map(getMacroCategory));

    for (const cat of categories) {
      categoryVolume.set(cat, (categoryVolume.get(cat) ?? 0) + volume);
    }
    for (const muscle of muscles) {
      muscleVolume.set(muscle, (muscleVolume.get(muscle) ?? 0) + volume);
    }
  }

  const totalVolume = [...categoryVolume.values()].reduce((s, v) => s + v, 0);
  if (totalVolume === 0) return [];

  return MACRO_ORDER
    .filter(cat => categoryVolume.has(cat))
    .map(cat => {
      const volume = categoryVolume.get(cat) ?? 0;
      const muscles: MuscleDetail[] = [...muscleVolume.entries()]
        .filter(([m]) => getMacroCategory(m) === cat)
        .map(([muscle, vol]) => ({ muscle, volume: Math.round(vol) }))
        .sort((a, b) => b.volume - a.volume);
      return {
        category: cat,
        volume: Math.round(volume),
        percentage: Math.round((volume / totalVolume) * 100),
        muscles,
      };
    });
}
