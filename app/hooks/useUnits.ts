import { useContext } from 'react';
import { UnitsContext } from '@/contexts/UnitsContext';
import type { UnitsContextValue } from '@/contexts/UnitsContext';

export function useUnits(): UnitsContextValue {
  const ctx = useContext(UnitsContext);
  if (!ctx) throw new Error('useUnits must be used within UnitsContextProvider');
  return ctx;
}
