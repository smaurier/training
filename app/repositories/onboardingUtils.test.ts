import { shouldSkip } from '../services/onboardingUtils';
import type { Program } from '../db/types';

const noPrograms: Program[] = [];
const oneProgram: Program[] = [
  { id: 1, name: 'PPL', description: null, is_active: 1, created_at: '', template_id: 'ppl-3j' },
];

describe('shouldSkip', () => {
  it('program: skip si programs.length > 0 et pas review', () => {
    expect(shouldSkip('program', oneProgram, false)).toBe(true);
  });
  it('program: ne skip pas si programs.length > 0 et review=true', () => {
    expect(shouldSkip('program', oneProgram, true)).toBe(false);
  });
  it('program: ne skip pas si programs vide', () => {
    expect(shouldSkip('program', noPrograms, false)).toBe(false);
  });
  it('program: ne skip pas si programs vide + review', () => {
    expect(shouldSkip('program', noPrograms, true)).toBe(false);
  });
  it('philosophy: jamais skip', () => {
    expect(shouldSkip('philosophy', oneProgram, false)).toBe(false);
  });
  it('ready: jamais skip', () => {
    expect(shouldSkip('ready', oneProgram, false)).toBe(false);
  });
  it('session-demo: jamais skip', () => {
    expect(shouldSkip('session-demo', oneProgram, false)).toBe(false);
  });
});
