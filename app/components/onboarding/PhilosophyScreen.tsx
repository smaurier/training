import { Spacing } from '@/constants/Spacing';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius } from '@/constants/Radius';
import { LetterSpacing, FontFamily  } from '@/constants/Typography';
import type { ScreenProps } from '@/app/onboarding';

export function PhilosophyScreen({ onNext }: ScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Bienvenue.</Text>

        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          {"Cette app est un carnet d'entraînement.\n"}
          {"Elle suit ta progression. Elle te guide en séance.\n"}
          {"Elle n'est pas là pour te juger."}
        </Text>

        <View style={[styles.block, { borderColor: colors.border }]}>
          <Text style={[styles.blockBody, { color: colors.textSecondary }]}>
            {'Pas de classements. Pas de comparaisons.\n'}
            {'Pas de message si tu rates une séance.'}
          </Text>
        </View>

        <View style={[styles.block, { borderColor: colors.border }]}>
          <Text style={[styles.blockBody, { color: colors.textSecondary }]}>
            {"Ta courbe de progression t'appartient.\n"}
            {"Elle est là quand tu la cherches."}
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <PressableA11y
          onPress={onNext}
          style={[styles.button, { backgroundColor: colors.primary }]}
          accessibilityLabel="Continuer vers la configuration"
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, { color: colors.onPrimary }]}>CONTINUER →</Text>
        </PressableA11y>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.xxl, paddingTop: 48, gap: 28 },
  title: { fontSize: 40, fontFamily: FontFamily.black, letterSpacing: LetterSpacing.tighter },
  intro: { fontSize: 17, fontFamily: FontFamily.regular, lineHeight: 26 },
  block: { borderWidth: 1, borderRadius: Radius.sm, padding: Spacing.lg },
  blockBody: { fontSize: 15, fontFamily: FontFamily.regular, lineHeight: 24 },
  footer: { padding: Spacing.xxl, borderTopWidth: 1 },
  button: { borderRadius: Radius.sm, padding: Spacing.xl, alignItems: 'center' },
  buttonText: { fontSize: 16, fontFamily: FontFamily.bold, letterSpacing: LetterSpacing.max },
});
