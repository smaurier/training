import { useContext, useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useColorScheme } from '@/components/useColorScheme';
import { ThemeContext } from '@/contexts/ThemeContext';
import { useUnits } from '@/hooks/useUnits';
import Colors from '@/constants/Colors';
import { Radius } from '@/constants/Radius';
import type { ThemePreference, UnitsPreference } from '@/services/settingsUtils';
import { getDb } from '@/db';
import { ExportService } from '@/services/ExportService';
import { SQLiteSettingsRepository } from '@/repositories/SQLiteSettingsRepository';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Système' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
];

const UNITS_OPTIONS: { value: UnitsPreference; label: string }[] = [
  { value: 'system', label: 'Système' },
  { value: 'kg', label: 'kg' },
  { value: 'lbs', label: 'lbs' },
];

function SegmentedControl<T extends string,>({
  options,
  selected,
  onSelect,
  colors,
  isDark,
}: {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (v: T) => void;
  colors: typeof Colors.light;
  isDark: boolean;
}) {
  return (
    <View style={[styles.segmented, { borderColor: colors.border, backgroundColor: colors.background }]}>
      {options.map((opt, i) => (
        <PressableA11y
          key={opt.value}
          accessibilityLabel={opt.label}
          accessibilityState={{ selected: selected === opt.value }}
          onPress={() => onSelect(opt.value)}
          style={[
            styles.segment,
            i < options.length - 1 && { borderRightWidth: 1, borderRightColor: colors.border },
            selected === opt.value && { backgroundColor: colors.primary },
          ]}
        >
          <Text style={[
            styles.segmentText,
            { color: selected === opt.value ? (isDark ? '#000' : '#fff') : colors.text },
          ]}>
            {opt.label}
          </Text>
        </PressableA11y>
      ))}
    </View>
  );
}

export default function ReglagesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const themeCtx = useContext(ThemeContext)!;
  const { preference: unitsPref, resolved: resolvedUnits, setUnit } = useUnits();

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [deloadWeeksStr, setDeloadWeeksStr] = useState<'4' | '6' | '8'>('4');

  useEffect(() => {
    const repo = new SQLiteSettingsRepository(getDb());
    repo.get('deload_weeks').then(v => {
      if (v === '4' || v === '6' || v === '8') setDeloadWeeksStr(v);
    }).catch(console.error);
  }, []);

  const handleDeloadWeeksChange = useCallback(async (v: '4' | '6' | '8') => {
    setDeloadWeeksStr(v);
    const repo = new SQLiteSettingsRepository(getDb());
    await repo.set('deload_weeks', v);
  }, []);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const service = new ExportService(getDb());
      await service.exportAll();
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export impossible. Réessaie.');
    } finally {
      setIsExporting(false);
    }
  }, []);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>APPARENCE</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SegmentedControl
          options={THEME_OPTIONS}
          selected={themeCtx.preference}
          onSelect={(v) => { themeCtx.setTheme(v); }}
          colors={colors}
          isDark={isDark}
        />
        {themeCtx.preference === 'system' && (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Actuellement : {themeCtx.resolved === 'dark' ? 'Sombre' : 'Clair'}
          </Text>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>UNITÉS</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SegmentedControl
          options={UNITS_OPTIONS}
          selected={unitsPref}
          onSelect={(v) => { setUnit(v); }}
          colors={colors}
          isDark={isDark}
        />
        {unitsPref === 'system' && (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Actuellement : {resolvedUnits}
          </Text>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DÉCHARGE AUTOMATIQUE</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 8 }]}>
          Semaines d'entraînement avant de suggérer une semaine de décharge
        </Text>
        <SegmentedControl
          options={[
            { value: '4' as const, label: '4 sem.' },
            { value: '6' as const, label: '6 sem.' },
            { value: '8' as const, label: '8 sem.' },
          ]}
          selected={deloadWeeksStr}
          onSelect={handleDeloadWeeksChange}
          colors={colors}
          isDark={isDark}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DONNÉES</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <PressableA11y
          accessibilityLabel="Exporter toutes mes données d'entraînement au format JSON"
          onPress={handleExport}
          disabled={isExporting}
          style={[styles.exportRow, { opacity: isExporting ? 0.5 : 1 }]}
        >
          <View style={styles.exportInfo}>
            <Text style={[styles.exportLabel, { color: colors.text }]}>Exporter mes données</Text>
            <Text style={[styles.exportMeta, { color: colors.textSecondary }]}>Sauvegarde complète (JSON)</Text>
          </View>
          {isExporting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.exportArrow, { color: colors.primary }]}>→</Text>
          )}
        </PressableA11y>
        {exportError && (
          <Text style={[styles.exportError, { color: '#dc2626' }]}>{exportError}</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginTop: 8, marginBottom: 4 },
  card: { borderWidth: 1, borderRadius: Radius.sm, padding: 16, gap: 10 },
  segmented: { flexDirection: 'row', borderWidth: 1, borderRadius: Radius.sm, overflow: 'hidden' },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  segmentText: { fontSize: 14, fontWeight: '500' },
  hint: { fontSize: 12, textAlign: 'center' },
  exportRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  exportInfo: { flex: 1, gap: 2 },
  exportLabel: { fontSize: 15, fontWeight: '500' },
  exportMeta: { fontSize: 12 },
  exportArrow: { fontSize: 18, fontWeight: '600', marginLeft: 8 },
  exportError: { fontSize: 13, marginTop: 4 },
});
