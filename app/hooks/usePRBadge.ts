import { useState, useCallback, useRef, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import type { SetActual } from '@/services/SessionService';

export function usePRBadge(
  validateSet: (actual: SetActual) => Promise<boolean>,
  currentExerciseName: string,
): { prBadge: string | null; handleValidate: (actual: SetActual) => Promise<void> } {
  const [prBadge, setPrBadge] = useState<string | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, []);

  const handleValidate = useCallback(async (actual: SetActual) => {
    const isPR = await validateSet(actual);
    if (isPR && currentExerciseName) {
      if (timeout.current) clearTimeout(timeout.current);
      setPrBadge(currentExerciseName);
      AccessibilityInfo.announceForAccessibility('Nouvelle meilleure marque !');
      timeout.current = setTimeout(() => setPrBadge(null), 3000);
    }
  }, [validateSet, currentExerciseName]);

  return { prBadge, handleValidate };
}
