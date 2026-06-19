// app/components/onboarding/SettingsIntroScreen.tsx
import { Spacing } from '@/constants/Spacing';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useState, useCallback } from 'react';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius } from '@/constants/Radius';
import { FontFamily, LetterSpacing } from '@/constants/Typography';
import { useUnits } from '@/hooks/useUnits';
import { SQLiteSettingsRepository } from '@/repositories/SQLiteSettingsRepository';
import { getDb } from '@/db';
import type { PlateStepValue } from '@/services/settingsUtils';
import type { ScreenProps } from '@/app/onboarding';

// Reproduit le SegmentedControl local de reglages.tsx
function SegmentedControl<T extends string>({
  options,
  selected,
  onSelect,
  colors,
}: {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (v: T) => void;
  colors: typeof Colors.light;
}) {
  return (
    <View style={[sc.container, { borderColor: colors.border, backgroundColor: colors.background }]}>
      {options.map((opt, i) => (
        <PressableA11y
          key={opt.value}
          accessibilityLabel={opt.label}
          accessibilityState={{ selected: selected === opt.value }}
          onPress={() => onSelect(opt.value)}
          style={[
            sc.segment,
            i < options.length - 1 && { borderRightWidth: 1, borderRightColor: colors.border },
            selected === opt.value && { backgroundColor: colors.primary },
          ]}
        >
          <Text style={[
            sc.segmentText,
            { color: selected === opt.value ? colors.onPrimary : colors.text },
          ]}>
            {opt.label}
          </Text>
        </PressableA11y>
      ))}
    </View>
  );
}

const sc = StyleSheet.create({
  container: { flexDirection: 'row', borderWidth: 1, borderRadius: Radius.lg, overflow: 'hidden' },
  segment: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center' },
  segmentText: { fontSize: 14, fontFamily: FontFamily.medium },
});

const UNITS_OPTIONS = [
  { value: 'system' as const, label: 'Système' },
  { value: 'kg' as const,     label: 'kg' },
  { value: 'lbs' as const,    label: 'lbs' },
];

const PLATE_STEP_OPTIONS_KG: { value: PlateStepValue; label: string }[] = [
  { value: '1',   label: '1 kg' },
  { value: '2',   label: '2 kg' },
  { value: '2.5', label: '2,5 kg' },
  { value: '5',   label: '5 kg' },
];

const PLATE_STEP_OPTIONS_LBS: { value: PlateStepValue; label: string }[] = [
  { value: '1.25', label: '2,5 lbs' },
  { value: '2.5',  label: '5 lbs' },
  { value: '5',    label: '10 lbs' },
];

export function SettingsIntroScreen({ onNext, onBack }: ScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { preference: unitsPref, resolved: resolvedUnits, setUnit } = useUnits();
  const [plateStep, setPlateStepState] = useState<PlateStepValue>('2.5');

  const plateOptions = resolvedUnits === 'lbs' ? PLATE_STEP_OPTIONS_LBS : PLATE_STEP_OPTIONS_KG;

  const handlePlateStep = useCallback(async (v: PlateStepValue) => {
    setPlateStepState(v);
    const repo = new SQLiteSettingsRepository(getDb());
    await repo.set('plate_step', v);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PressableA11y onPress={onBack} accessibilityLabel="Retour" accessibilityRole="button">
          <Text style={{ color: colors.textSecondary }}>← Retour</Text>
        </PressableA11y>

        <Text style={[styles.title, { color: colors.text }]}>Quelques réglages</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Configure l'essentiel maintenant. Tout est modifiable dans l'onglet Réglages.
        </Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Unités</Text>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Tous les poids s'adaptent automatiquement.
          </Text>
          <SegmentedControl
            options={UNITS_OPTIONS}
            selected={unitsPref}
            onSelect={setUnit}
            colors={colors}
          />
          {unitsPref === 'system' && (
            <Text style={[styles.systemHint, { color: colors.textSecondary }]}>
              {`Ton téléphone utilise les ${resolvedUnits === 'lbs' ? 'lbs' : 'kg'}`}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Pas de progression</Text>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Incrément de poids appliqué automatiquement à chaque progression réussie.
          </Text>
          <SegmentedControl
            options={plateOptions}
            selected={plateStep}
            onSelect={handlePlateStep}
            colors={colors}
          />
        </View>

        <View style={[styles.infoBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Les notifications de rappel sont configurables dans l'onglet Réglages après le lancement.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <PressableA11y
          onPress={onNext}
          style={[styles.button, { backgroundColor: colors.primary }]}
          accessibilityLabel="Continuer"
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, { color: colors.onPrimary }]}>CONTINUER</Text>
        </PressableA11y>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.xxl, gap: Spacing.xxl },
  title: { fontSize: 24, fontFamily: FontFamily.bold },
  subtitle: { fontSize: 14, fontFamily: FontFamily.regular },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: 14, fontFamily: FontFamily.bold },
  sectionHint: { fontSize: 13, fontFamily: FontFamily.regular },
  systemHint: { fontSize: 12, fontFamily: FontFamily.regular, marginTop: 4 },
  infoBlock: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md },
  infoText: { fontSize: 13, fontFamily: FontFamily.regular, lineHeight: 18 },
  footer: { padding: Spacing.xxl, borderTopWidth: 1 },
  button: { borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center' },
  buttonText: { fontSize: 16, fontFamily: FontFamily.bold, letterSpacing: LetterSpacing.max },
});
