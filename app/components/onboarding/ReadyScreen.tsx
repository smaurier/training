// app/components/onboarding/ReadyScreen.tsx
import { View, Text, StyleSheet } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import type { ScreenProps } from '@/app/onboarding';

export function ReadyScreen({ wizardState, onNext, isReview }: ScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          {isReview ? "Rappel terminé" : "C'est parti"}
        </Text>

        {!isReview && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Tout est prêt. Lance ta première séance depuis l'accueil.
          </Text>
        )}

        <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {wizardState.objective && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryKey, { color: colors.textSecondary }]}>Objectif</Text>
              <Text style={[styles.summaryVal, { color: colors.text }]}>
                {wizardState.objective.charAt(0).toUpperCase() + wizardState.objective.slice(1)}
              </Text>
            </View>
          )}
          {wizardState.selectedProgramId && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryKey, { color: colors.textSecondary }]}>Programme</Text>
              <Text style={[styles.summaryVal, { color: colors.text }]}>Importé ✓</Text>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <PressableA11y
          onPress={onNext}
          style={[styles.button, { backgroundColor: colors.primary }]}
          accessibilityLabel={isReview ? "Retour aux réglages" : "Commencer"}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            {isReview ? "Retour aux réglages" : "Commencer →"}
          </Text>
        </PressableA11y>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: 'center', gap: 24 },
  title: { fontSize: 32, fontFamily: 'Inter_900Black' },
  subtitle: { fontSize: 16, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  summary: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryKey: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  summaryVal: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  footer: { padding: 24, borderTopWidth: 1 },
  button: { borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
});
