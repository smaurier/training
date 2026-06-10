import React, { createContext, useState, useCallback } from 'react';
import * as Localization from 'expo-localization';
import type { ISettingsRepository } from '@/repositories/ISettingsRepository';
import { resolveUnits, convertWeight } from '@/services/settingsUtils';
import type { UnitsPreference } from '@/services/settingsUtils';

interface UnitsContextValue {
  preference: UnitsPreference;
  resolved: 'kg' | 'lbs';
  setUnit: (pref: UnitsPreference) => Promise<void>;
  convert: (kg: number) => string;
  label: 'kg' | 'lbs';
}

export type { UnitsContextValue };

export const UnitsContext = createContext<UnitsContextValue | null>(null);

interface UnitsContextProviderProps {
  initialPreference: UnitsPreference;
  repo: ISettingsRepository;
  children: React.ReactNode;
}

export function UnitsContextProvider({ initialPreference, repo, children }: UnitsContextProviderProps) {
  const [preference, setPreference] = useState<UnitsPreference>(initialPreference);
  const region = Localization.getLocales()[0]?.regionCode ?? '';
  const resolved = resolveUnits(preference, region);

  const setUnit = useCallback(async (pref: UnitsPreference) => {
    setPreference(pref);
    await repo.set('units', pref);
  }, [repo]);

  const convert = useCallback((kg: number) => convertWeight(kg, resolved), [resolved]);

  return (
    <UnitsContext.Provider value={{ preference, resolved, setUnit, convert, label: resolved }}>
      {children}
    </UnitsContext.Provider>
  );
}
