import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import type { ScreenProps } from '@/app/onboarding';

export function PhilosophyScreen({ onNext }: ScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Bienvenue</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Une app d'entraînement pensée différemment.
        </Text>

        <Text style={[styles.manifeste, { color: colors.text }]}>
          Ta progression est visible, motivante, et personnelle.{'\n'}
          Elle ne te compare à personne.{'\n'}
          Elle ne te punit jamais.
        </Text>

        <View style={[styles.block, { borderColor: colors.border }]}>
          <Text style={[styles.blockTitle, { color: colors.text }]}>Ce que tu ne trouveras pas</Text>
          <Text style={[styles.blockBody, { color: colors.textSecondary }]}>
            {'— Pas de streak à maintenir\n'}
            {'— Pas de "tu n\'as pas fait de séance depuis X jours"\n'}
            {'— Pas de classements ou comparaisons\n'}
            {'— Pas d\'objectifs quotidiens culpabilisants'}
          </Text>
        </View>

        <View style={[styles.block, { borderColor: colors.border }]}>
          <Text style={[styles.blockTitle, { color: colors.text }]}>Ce que tu vas trouver</Text>
          <Text style={[styles.blockBody, { color: colors.textSecondary }]}>
            {'— Suivi précis série par série\n'}
            {'— Progression automatique des charges\n'}
            {'— Tes meilleures marques et ton historique\n'}
            {'— Une séance guidée du début à la fin'}
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
          <Text style={[styles.buttonText, { color: colors.background }]}>Continuer</Text>
        </PressableA11y>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingTop: 40, gap: 24 },
  title: { fontSize: 32, fontFamily: 'Inter_900Black' },
  subtitle: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  manifeste: { fontSize: 18, fontFamily: 'Inter_600SemiBold', lineHeight: 28 },
  block: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 },
  blockTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  blockBody: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  footer: { padding: 24, borderTopWidth: 1 },
  button: { borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
});
