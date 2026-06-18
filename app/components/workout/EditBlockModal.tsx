import { Spacing } from '@/constants/Spacing';
import { FontFamily } from '@/constants/Typography';
import { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Switch, StyleSheet, ScrollView } from 'react-native';
import type { Block } from '@/db/types';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

const MODAL_OVERLAY_COLOR = 'rgba(0,0,0,0.4)' as const;

const CHIPS = [
  { label: 'Échauffement', isWork: false },
  { label: 'Travail',      isWork: true  },
  { label: 'Back-off',     isWork: true  },
] as const;

interface EditBlockModalProps {
  visible: boolean;
  block: Block | null;
  workoutExerciseId: number;
  onSave: (name: string, isWorkBlock: 0 | 1) => Promise<void>;
  onClose: () => void;
}

export function EditBlockModal({ visible, block, workoutExerciseId: _workoutExerciseId, onSave, onClose }: EditBlockModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [name, setName] = useState(block?.name ?? '');
  const [isWorkBlock, setIsWorkBlock] = useState((block?.is_work_block ?? 1) === 1);

  useEffect(() => {
    setName(block?.name ?? '');
    setIsWorkBlock((block?.is_work_block ?? 1) === 1);
  }, [block, visible]);

  const canSave = name.trim().length > 0;

  async function handleSave() {
    if (!canSave) return;
    await onSave(name.trim(), isWorkBlock ? 1 : 0);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" accessibilityViewIsModal>
      <View style={[styles.overlay, { backgroundColor: MODAL_OVERLAY_COLOR }]}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            {block ? 'Renommer le bloc' : 'Nouveau bloc'}
          </Text>

          {!block && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
              contentContainerStyle={styles.chipsRow}
            >
              {CHIPS.map(chip => (
                <PressableA11y
                  key={chip.label}
                  accessibilityLabel={`Suggérer ${chip.label}`}
                  accessibilityState={{ selected: name === chip.label }}
                  onPress={() => { setName(chip.label); setIsWorkBlock(chip.isWork); }}
                  style={[
                    styles.chip,
                    { borderColor: colors.primary },
                    ...(name === chip.label ? [{ backgroundColor: colors.primary + '15' }] : []),
                  ]}
                >
                  <Text style={[styles.chipText, { color: colors.primary }]}>{chip.label}</Text>
                </PressableA11y>
              ))}
            </ScrollView>
          )}

          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={name}
            onChangeText={setName}
            placeholder="Nom du bloc"
            placeholderTextColor={colors.textSecondary}
            autoFocus
            accessibilityLabel="Nom du bloc"
          />

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>Bloc de travail</Text>
            <Switch
              value={isWorkBlock}
              onValueChange={setIsWorkBlock}
              accessibilityLabel="Bloc de travail"
            />
          </View>

          <View style={styles.buttons}>
            <PressableA11y
              accessibilityLabel="Annuler"
              onPress={onClose}
              style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
            >
              <Text style={{ color: colors.text }}>Annuler</Text>
            </PressableA11y>
            <PressableA11y
              accessibilityLabel="Enregistrer"
              onPress={handleSave}
              accessibilityState={{ disabled: !canSave }}
              style={[styles.btn, { backgroundColor: colors.primary, opacity: canSave ? 1 : 0.4 }]}
            >
              <Text style={{ color: colors.onPrimary }}>Enregistrer</Text>
            </PressableA11y>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: Spacing.xl, gap: Spacing.lg },
  title: { fontSize: 17, fontFamily: FontFamily.semibold },
  input: { borderWidth: 1, borderRadius: Radius.sm, padding: Spacing.md, fontSize: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { fontSize: 15 },
  buttons: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs },
  btn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: Radius.sm },
  chip: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  chipsScroll: { marginBottom: -4 },
  chipsRow: { flexDirection: 'row', gap: Spacing.sm, paddingBottom: Spacing.xs },
  chipText: { fontSize: 13, fontFamily: FontFamily.medium },
});
