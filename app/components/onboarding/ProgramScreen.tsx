import { View, Text, FlatList, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { useState } from 'react';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePrograms } from '@/hooks/usePrograms';
import { TEMPLATES } from '@/data/templates';
import { importTemplate, isTemplateImported } from '@/services/TemplateService';
import { getDb } from '@/db';
import { SQLiteProgramRepository } from '@/repositories/SQLiteProgramRepository';
import { SQLiteWorkoutRepository } from '@/repositories/SQLiteWorkoutRepository';
import { SQLiteWorkoutExerciseRepository } from '@/repositories/SQLiteWorkoutExerciseRepository';
import { SQLiteBlockRepository } from '@/repositories/SQLiteBlockRepository';
import { SQLiteSetRepository } from '@/repositories/SQLiteSetRepository';
import { SQLiteExerciseRepository } from '@/repositories/SQLiteExerciseRepository';
import type { ScreenProps } from '@/app/onboarding';
import type { TemplateDefinition } from '@/data/templates';

const OBJECTIVE_LEVELS: Record<string, TemplateDefinition['level'][]> = {
  force:        ['débutant', 'intermédiaire'],
  hypertrophie: ['intermédiaire', 'avancé'],
  maintien:     ['débutant', 'intermédiaire'],
  cardio:       ['débutant', 'intermédiaire'],
};

export function ProgramScreen({ wizardState, setWizardState, onNext, onBack, isReview }: ScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { programs, refresh } = usePrograms();
  const [selected, setSelected] = useState<TemplateDefinition | null>(null);
  const [programName, setProgramName] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const relevantLevels = wizardState.objective ? OBJECTIVE_LEVELS[wizardState.objective] : null;
  const filtered = relevantLevels
    ? TEMPLATES.filter(t => relevantLevels.includes(t.level))
    : TEMPLATES;

  const activeProgram = programs.find(p => p.is_active === 1);

  const handleImport = async () => {
    if (!selected || !programName.trim()) return;
    setImporting(true);
    setError(null);
    try {
      const db = getDb();
      const id = await importTemplate(
        selected,
        programName.trim(),
        new SQLiteProgramRepository(db),
        new SQLiteWorkoutRepository(db),
        new SQLiteWorkoutExerciseRepository(db),
        new SQLiteBlockRepository(db),
        new SQLiteSetRepository(db),
        new SQLiteExerciseRepository(db),
      );
      await refresh();
      setWizardState({ selectedProgramId: id });
      onNext();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'import");
    } finally {
      setImporting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <PressableA11y onPress={onBack} accessibilityLabel="Retour" accessibilityRole="button">
          <Text style={{ color: colors.textSecondary }}>← Retour</Text>
        </PressableA11y>
        <Text style={[styles.title, { color: colors.text }]}>Choisis un programme</Text>
        {isReview && activeProgram && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Programme actuel : {activeProgram.name}
          </Text>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={t => t.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const alreadyImported = isTemplateImported(programs, item.id);
          const isSelected = selected?.id === item.id;
          return (
            <PressableA11y
              onPress={() => { setSelected(item); setProgramName(item.name); }}
              style={[
                styles.card,
                { borderColor: colors.border, backgroundColor: colors.surface },
                isSelected && { borderColor: colors.primary },
              ]}
              accessibilityLabel={item.name}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.cardRow}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
                {alreadyImported && (
                  <Text style={[styles.badge, { color: colors.textSecondary }]}>Déjà importé</Text>
                )}
              </View>
              <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                {item.frequency} · {item.level}
              </Text>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{item.description}</Text>
            </PressableA11y>
          );
        }}
      />

      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        {selected ? (
          <>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
              value={programName}
              onChangeText={setProgramName}
              placeholder="Nom du programme"
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel="Nom du programme"
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
            <PressableA11y
              onPress={handleImport}
              disabled={!programName.trim() || importing}
              style={[
                styles.button,
                { backgroundColor: colors.primary },
                (!programName.trim() || importing) && { opacity: 0.4 },
              ]}
              accessibilityLabel="Importer et continuer"
              accessibilityRole="button"
            >
              {importing
                ? <ActivityIndicator color={colors.background} />
                : <Text style={[styles.buttonText, { color: colors.background }]}>Importer et continuer</Text>
              }
            </PressableA11y>
          </>
        ) : (
          <PressableA11y
            onPress={onNext}
            style={[styles.buttonSecondary]}
            accessibilityLabel="Passer cette étape"
            accessibilityRole="button"
          >
            <Text style={{ color: colors.textSecondary }}>Passer cette étape →</Text>
          </PressableA11y>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, gap: 8 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  list: { paddingHorizontal: 24, gap: 12, paddingBottom: 24 },
  card: { borderWidth: 1.5, borderRadius: 12, padding: 16, gap: 4 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  badge: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  cardMeta: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  cardDesc: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  footer: { padding: 16, borderTopWidth: 1, gap: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
  button: { borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  buttonSecondary: { padding: 16, alignItems: 'center' },
  errorText: { color: '#ef4444', fontSize: 13, fontFamily: 'Inter_400Regular' },
});
