import { View, Text, TextInput, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { LetterSpacing } from '@/constants/Typography';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import { usePrograms } from '@/hooks/usePrograms';
import { TEMPLATES } from '@/data/templates';
import type { TemplateDefinition } from '@/data/templates';
import { importTemplate, isTemplateImported } from '@/services/TemplateService';
import { getDb } from '@/db';
import { SQLiteProgramRepository } from '@/repositories/SQLiteProgramRepository';
import { SQLiteWorkoutRepository } from '@/repositories/SQLiteWorkoutRepository';
import { SQLiteWorkoutExerciseRepository } from '@/repositories/SQLiteWorkoutExerciseRepository';
import { SQLiteBlockRepository } from '@/repositories/SQLiteBlockRepository';
import { SQLiteSetRepository } from '@/repositories/SQLiteSetRepository';
import { SQLiteExerciseRepository } from '@/repositories/SQLiteExerciseRepository';

const WARNING_COLOR = '#f59e0b' as const;

const LEVEL_LABELS: Record<TemplateDefinition['level'], string> = {
  débutant: 'Débutant',
  intermédiaire: 'Intermédiaire',
  avancé: 'Avancé',
};

export default function ImportTemplateModal() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { programs } = usePrograms();

  const [selected, setSelected] = useState<TemplateDefinition | null>(null);
  const [programName, setProgramName] = useState('');
  const [importing, setImporting] = useState(false);

  const alreadyImported = selected ? isTemplateImported(programs, selected.id) : false;
  const canImport = selected !== null && programName.trim().length > 0 && !importing;

  function handleSelect(template: TemplateDefinition) {
    setSelected(template);
    setProgramName(template.name);
  }

  async function handleImport() {
    if (!selected || !programName.trim()) return;
    setImporting(true);
    try {
      const db = getDb();
      await importTemplate(
        selected,
        programName.trim(),
        new SQLiteProgramRepository(db),
        new SQLiteWorkoutRepository(db),
        new SQLiteWorkoutExerciseRepository(db),
        new SQLiteBlockRepository(db),
        new SQLiteSetRepository(db),
        new SQLiteExerciseRepository(db),
      );
      router.back();
    } catch (e) {
      Alert.alert('Erreur', String(e));
    } finally {
      setImporting(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Choisir un programme
        </Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Choisir un template">
          {TEMPLATES.map(template => {
            const isSelected = selected?.id === template.id;
            return (
              <PressableA11y
                key={template.id}
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: isSelected ? colors.primary : colors.border },
                  isSelected && styles.cardSelected,
                ]}
                onPress={() => handleSelect(template)}
                accessibilityLabel={`Template ${template.name}, ${template.level}, ${template.frequency}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
              >
                <View style={styles.cardRow}>
                  <Text style={[styles.cardName, { color: colors.text }]}>{template.name}</Text>
                  <Text style={[styles.cardFreq, { color: colors.textSecondary }]}>{template.frequency}</Text>
                </View>
                <View style={styles.cardRow}>
                  <Text style={[styles.cardLevel, { color: colors.textSecondary }]}>
                    {LEVEL_LABELS[template.level]}
                  </Text>
                  <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                    {template.workouts.length} séance{template.workouts.length > 1 ? 's' : ''}
                  </Text>
                </View>
              </PressableA11y>
            );
          })}
        </View>

        {selected !== null && (
          <View style={styles.importSection}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Nom du programme
            </Text>
            {alreadyImported && (
              <View style={[styles.warning, { borderColor: WARNING_COLOR }]}>
                <Text style={[styles.warningText, { color: WARNING_COLOR }]}>
                  Ce template a déjà été importé. Tu peux donner un nom différent pour mieux t&apos;y retrouver.
                </Text>
              </View>
            )}
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={programName}
              onChangeText={setProgramName}
              placeholder="Nom du programme"
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel="Nom du programme"
              returnKeyType="done"
              editable={true}
              selectTextOnFocus={true}
            />
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <PressableA11y
          style={[
            styles.submitBtn,
            { backgroundColor: canImport ? colors.primary : colors.surfaceElevated, opacity: canImport ? 1 : 0.5 },
          ]}
          onPress={handleImport}
          disabled={!canImport}
          accessibilityLabel="Importer le programme"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canImport }}
        >
          {importing ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={[styles.submitText, { color: canImport ? colors.onPrimary : colors.textDisabled }]}>
              Importer
            </Text>
          )}
        </PressableA11y>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 24, gap: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: LetterSpacing.wide,
    marginBottom: 4,
    marginTop: 8,
  },
  card: {
    padding: 14,
    borderRadius: Radius.sm,
    borderWidth: 1,
    gap: 4,
    minHeight: 44,
  },
  cardSelected: { borderWidth: 2 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 15, fontWeight: '600' },
  cardFreq: { fontSize: 13 },
  cardLevel: { fontSize: 12 },
  cardDesc: { fontSize: 12 },
  importSection: { marginTop: 16, gap: 8 },
  warning: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: 12,
  },
  warningText: { fontSize: 13, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 44,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  submitBtn: {
    height: 50,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { fontSize: 16, fontWeight: '600' },
});
