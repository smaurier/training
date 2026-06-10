import { useContext } from 'react';
import { useColorScheme as useColorSchemeRN } from 'react-native';
import { ThemeContext } from '@/contexts/ThemeContext';

export const useColorScheme = (): 'light' | 'dark' => {
  const themeCtx = useContext(ThemeContext);
  const osScheme = useColorSchemeRN() ?? 'light';
  return themeCtx?.resolved ?? osScheme;
};
