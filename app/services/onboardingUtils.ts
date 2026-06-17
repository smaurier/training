import type { Program } from '../db/types';

export type OnboardingScreenId =
  | 'philosophy'
  | 'objective'
  | 'program'
  | 'session-demo'
  | 'settings-intro'
  | 'progression'
  | 'ready';

export function shouldSkip(
  screenId: OnboardingScreenId,
  programs: Program[],
  isReview: boolean,
): boolean {
  if (screenId === 'program') {
    return programs.length > 0 && !isReview;
  }
  return false;
}
