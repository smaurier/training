export type ThemePreference = 'system' | 'light' | 'dark';
export type UnitsPreference = 'system' | 'kg' | 'lbs';

const LBS_REGIONS = ['US', 'LR', 'MM'];

export function resolveTheme(
  preference: ThemePreference,
  osScheme: 'light' | 'dark'
): 'light' | 'dark' {
  return preference === 'system' ? osScheme : preference;
}

export function resolveUnits(
  preference: UnitsPreference,
  regionCode: string
): 'kg' | 'lbs' {
  if (preference === 'kg') return 'kg';
  if (preference === 'lbs') return 'lbs';
  return LBS_REGIONS.includes(regionCode) ? 'lbs' : 'kg';
}

export function convertWeight(kg: number, unit: 'kg' | 'lbs'): string {
  if (unit === 'lbs') {
    return String(Math.round(kg * 2.20462 * 10) / 10);
  }
  return String(Math.round(kg * 10) / 10);
}

export function lbsToKg(lbs: number): number {
  return lbs / 2.20462;
}

const VALID_PLATE_STEPS = [1, 1.25, 2, 2.5, 5] as const;
export type PlateStepValue = '1' | '1.25' | '2' | '2.5' | '5';

export function getPlateStep(stored: string | null): number {
  const n = parseFloat(stored ?? '');
  return (VALID_PLATE_STEPS as readonly number[]).includes(n) ? n : 2;
}
