import { resolveTheme, resolveUnits, convertWeight } from './settingsUtils';

describe('resolveTheme', () => {
  it('system + OS dark → dark', () => {
    expect(resolveTheme('system', 'dark')).toBe('dark');
  });
  it('system + OS light → light', () => {
    expect(resolveTheme('system', 'light')).toBe('light');
  });
  it('light override → light (ignore OS)', () => {
    expect(resolveTheme('light', 'dark')).toBe('light');
  });
  it('dark override → dark (ignore OS)', () => {
    expect(resolveTheme('dark', 'light')).toBe('dark');
  });
});

describe('resolveUnits', () => {
  it('system + US → lbs', () => {
    expect(resolveUnits('system', 'US')).toBe('lbs');
  });
  it('system + MM → lbs', () => {
    expect(resolveUnits('system', 'MM')).toBe('lbs');
  });
  it('system + LR → lbs', () => {
    expect(resolveUnits('system', 'LR')).toBe('lbs');
  });
  it('system + FR → kg', () => {
    expect(resolveUnits('system', 'FR')).toBe('kg');
  });
  it('system + région vide → kg', () => {
    expect(resolveUnits('system', '')).toBe('kg');
  });
  it('kg explicite → kg (ignore région)', () => {
    expect(resolveUnits('kg', 'US')).toBe('kg');
  });
  it('lbs explicite → lbs (ignore région)', () => {
    expect(resolveUnits('lbs', 'FR')).toBe('lbs');
  });
});

describe('convertWeight', () => {
  it('kg → string entier', () => {
    expect(convertWeight(80, 'kg')).toBe('80');
  });
  it('kg → string décimal arrondi 1 décimale', () => {
    expect(convertWeight(80.5, 'kg')).toBe('80.5');
  });
  it('lbs → conversion arrondie 1 décimale', () => {
    expect(convertWeight(100, 'lbs')).toBe('220.5');
  });
  it('0 → "0"', () => {
    expect(convertWeight(0, 'kg')).toBe('0');
  });
});
