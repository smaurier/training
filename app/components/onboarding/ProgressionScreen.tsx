// app/components/onboarding/ProgressionScreen.tsx
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius } from '@/constants/Radius';
import { LetterSpacing, FontFamily  } from '@/constants/Typography';
import type { ScreenProps } from '@/app/onboarding';

const SECTIONS = [
  {
    label: 'PRÉSENCES',
    description: 'Combien de séances tu as faites ce mois. Additif — jamais soustractif.',
  },
  {
    label: 'MEILLEURES MARQUES',
    description: 'Ton meilleur poids par exercice. Mis à jour automatiquement à chaque séance.',
  },
  {
    label: 'OBJECTIFS',
    description: "\"Squat 100 kg d'ici 3 mois.\" ETA calculé selon ta progression réelle.",
  },
  {
    label: 'VOLUME PAR GROUPE',
    description: 'Push / Pull / Jambes sur 4 semaines glissantes. Pour équilibrer ton entraînement.',
  },
  {
    label: 'CORPS',
    description: 'Poids de corps et tour de taille. Tendance sur 3 mois.',
  },
];

export function ProgressionScreen({ onNext, onBack }: ScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PressableA11y onPress={onBack} accessibilityLabel="Retour" accessibilityRole="button">
          <Text style={{ color: colors.textSecondary }}>← Retour</Text>
        </PressableA11y>

        <Text style={[styles.title, { color: colors.text }]}>Ta progression</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          L'onglet Progression se construit séance après séance. Voici ce que tu y trouveras.
        </Text>

        {SECTIONS.map(s => (
          <View key={s.label} style={[styles.row, { borderBottomColor: colors.border }]}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{s.label}</Text>
            <Text style={[styles.rowDesc, { color: colors.text }]}>{s.description}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <PressableA11y
          onPress={onNext}
          style={[styles.button, { backgroundColor: colors.primary }]}
          accessibilityLabel="Continuer"
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Continuer</Text>
        </PressableA11y>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 20 },
  title: { fontSize: 24, fontFamily: FontFamily.bold },
  subtitle: { fontSize: 14, fontFamily: FontFamily.regular, lineHeight: 20 },
  row: { borderBottomWidth: 1, paddingBottom: 16, gap: 4 },
  rowLabel: { fontSize: 11, fontFamily: FontFamily.bold, letterSpacing: LetterSpacing.wider },
  rowDesc: { fontSize: 14, fontFamily: FontFamily.regular, lineHeight: 20 },
  footer: { padding: 24, borderTopWidth: 1 },
  button: { borderRadius: Radius.lg, padding: 16, alignItems: 'center' },
  buttonText: { fontSize: 16, fontFamily: FontFamily.bold },
});
