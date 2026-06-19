// app/components/onboarding/ObjectiveScreen.tsx
import { Spacing } from '@/constants/Spacing';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius } from '@/constants/Radius';
import { FontFamily, LetterSpacing } from '@/constants/Typography';
import type { ScreenProps, Objective } from '@/app/onboarding';

const OBJECTIVES: { value: Objective; label: string; description: string }[] = [
  { value: 'force',        label: 'Force',              description: 'Soulever plus lourd. Progresser sur les grands mouvements.' },
  { value: 'hypertrophie', label: 'Hypertrophie',       description: 'Développer le volume musculaire. Plus de séries, plus de reps.' },
  { value: 'maintien',     label: 'Maintien',           description: 'Garder ce que tu as construit. Entraînement régulier et équilibré.' },
  { value: 'cardio',       label: 'Cardio / Endurance', description: 'Améliorer ton souffle et ta condition physique.' },
];

export function ObjectiveScreen({ wizardState, setWizardState, onNext, onBack }: ScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const selected = wizardState.objective;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <PressableA11y onPress={onBack} accessibilityLabel="Retour" accessibilityRole="button">
          <Text style={{ color: colors.textSecondary }}>← Retour</Text>
        </PressableA11y>
        <Text style={[styles.title, { color: colors.text }]}>Quel est ton objectif principal ?</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Pour te suggérer un programme adapté. Modifiable à tout moment.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {OBJECTIVES.map(obj => {
          const isSelected = selected === obj.value;
          return (
            <PressableA11y
              key={obj.value}
              onPress={() => setWizardState({ objective: obj.value })}
              style={[
                styles.card,
                { borderColor: colors.border, backgroundColor: colors.surface },
                isSelected && { borderColor: colors.primary },
              ]}
              accessibilityLabel={`${obj.label} — ${obj.description}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[styles.cardLabel, { color: colors.text }]}>{obj.label}</Text>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{obj.description}</Text>
            </PressableA11y>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <PressableA11y
          onPress={onNext}
          disabled={!selected}
          style={[
            styles.button,
            { backgroundColor: colors.primary },
            !selected && { opacity: 0.4 },
          ]}
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
  header: { padding: Spacing.xxl, gap: Spacing.sm },
  title: { fontSize: 24, fontFamily: FontFamily.bold },
  subtitle: { fontSize: 14, fontFamily: FontFamily.regular },
  list: { paddingHorizontal: Spacing.xxl, gap: Spacing.md, paddingBottom: Spacing.xxl },
  card: { borderWidth: 1.5, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.xs },
  cardLabel: { fontSize: 16, fontFamily: FontFamily.bold },
  cardDesc: { fontSize: 13, fontFamily: FontFamily.regular },
  footer: { padding: Spacing.xxl, borderTopWidth: 1 },
  button: { borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center' },
  buttonText: { fontSize: 16, fontFamily: FontFamily.bold, letterSpacing: LetterSpacing.max },
});
