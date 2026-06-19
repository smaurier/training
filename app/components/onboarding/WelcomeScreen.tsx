import { Spacing } from '@/constants/Spacing';
import { View, Text, StyleSheet } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius } from '@/constants/Radius';
import { LetterSpacing, FontFamily } from '@/constants/Typography';
import type { ScreenProps } from '@/app/onboarding';

const VALEURS = [
  {
    titre: 'Présence',
    corps: 'Chaque séance compte. Même imparfaite.',
  },
  {
    titre: 'Progression',
    corps: 'Tu t\'améliores à ton rythme. Personne d\'autre.',
  },
  {
    titre: 'Autonomie',
    corps: 'Tes données. Ton tempo. Zéro jugement.',
  },
];

export function WelcomeScreen({ onNext }: ScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <Text style={[styles.appName, { color: colors.text }]}>Trace.</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Ton entraînement.{'\n'}Ta progression.
          </Text>
        </View>

        <View style={styles.valeurs}>
          {VALEURS.map((v) => (
            <View key={v.titre} style={styles.valeurRow}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <View style={styles.valeurTexte}>
                <Text style={[styles.valeurTitre, { color: colors.text }]}>{v.titre}</Text>
                <Text style={[styles.valeurCorps, { color: colors.textSecondary }]}>{v.corps}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <PressableA11y
          onPress={onNext}
          style={[styles.button, { backgroundColor: colors.primary }]}
          accessibilityLabel="Commencer la configuration"
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, { color: colors.onPrimary }]}>COMMENCER →</Text>
        </PressableA11y>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: Spacing.xxl, paddingTop: 64, gap: 48 },
  hero: { gap: Spacing.lg },
  appName: {
    fontSize: 56,
    fontFamily: FontFamily.black,
    letterSpacing: LetterSpacing.display,
  },
  tagline: {
    fontSize: 22,
    fontFamily: FontFamily.regular,
    lineHeight: 32,
  },
  valeurs: { gap: Spacing.xl },
  valeurRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 999, marginTop: 6 },
  valeurTexte: { flex: 1, gap: 2 },
  valeurTitre: { fontSize: 16, fontFamily: FontFamily.semibold },
  valeurCorps: { fontSize: 14, fontFamily: FontFamily.regular, lineHeight: 20 },
  footer: { padding: Spacing.xxl, borderTopWidth: 1 },
  button: { borderRadius: Radius.sm, padding: Spacing.xl, alignItems: 'center' },
  buttonText: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    letterSpacing: LetterSpacing.max,
  },
});
