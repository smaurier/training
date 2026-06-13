import type { WeightType } from '../db/types';

export type WarmupSet = {
  weight: number;
  reps: number;
  rest: number;
  percent: number;
};

export function computeWarmupSets(workWeight: number): WarmupSet[] {
  const round2 = (w: number) => Math.floor(w / 2) * 2;
  return [
    { weight: round2(workWeight * 0.4), reps: 8, rest: 60, percent: 40 },
    { weight: round2(workWeight * 0.6), reps: 5, rest: 60, percent: 60 },
    { weight: round2(workWeight * 0.8), reps: 2, rest: 90, percent: 80 },
  ];
}

export function shouldShowWarmup(workWeight: number, weightType: WeightType): boolean {
  return weightType === 'fixed' && workWeight >= 40;
}
