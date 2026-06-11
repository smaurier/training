import { useContext } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useColorScheme } from '@/components/useColorScheme';
import { ThemeContext } from '@/contexts/ThemeContext';
import { useUnits } from '@/hooks/useUnits';
import Colors from '@/constants/Colors';
import { Radius } from '@/constants/Radius';
import type { ThemePreference, UnitsPreference } from '@/services/settingsUtils';

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
});
