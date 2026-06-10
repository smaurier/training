import React, { createContext, useState, useCallback } from 'react';
import { useColorScheme as useColorSchemeRN } from 'react-native';
import type { ISettingsRepository } from '@/repositories/ISettingsRepository';
import type { ThemePreference } from '@/services/settingsUtils';

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: 'light' | 'dark';
  setTheme: (pref: ThemePreference) => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeContextProviderProps {
  initialPreference: ThemePreference;
  repo: ISettingsRepository;
  children: React.ReactNode;
}

export function ThemeContextProvider({ initialPreference, repo, children }: ThemeContextProviderProps) {
  const osScheme = useColorSchemeRN() ?? 'light';
  const [preference, setPreference] = useState<ThemePreference>(initialPreference);

  const resolved: 'light' | 'dark' = preference === 'system' ? osScheme : preference;

  const setTheme = useCallback(async (pref: ThemePreference) => {
    setPreference(pref);
    await repo.set('theme', pref);
  }, [repo]);

  return (
    <ThemeContext.Provider value={{ preference, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
