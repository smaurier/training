import { Spacing } from '@/constants/Spacing';
import { useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet } from 'react-native';
import type { Set as TrainingSet, WeightType, SetType } from '@/db/types';
import type { UpdateSetDto } from '@/repositories/ISetRepository';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

const MODAL_OVERLAY_COLOR = 'rgba(0,0,0,0.4)' as const;

interface EditSetModalProps {
  set: TrainingSet;
  onSave: (dto: UpdateSetDto) => Promise<void>;
  onClose: () => void;
}

export function EditSetModal({ set, onSave, onClose }: EditSetModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [repsMin, setRepsMin] = useState(String(set.reps_min));
  const [weight, setWeight] = useState(set.weight != null ? String(set.weight) : '');
  const [weightType, setWeightType] = useState<WeightType>(set.weight_type);
  const [rest, setRest] = useState(String(set.rest_duration));
  const [setType, setSetType] = useState<SetType>(set.set_type);

  const weightDisabled = weightType === 'bodyweight' || weightType === 'bar';
  const isAmrap = setType === 'amrap';
  const isDropset = rest === '0';

  const SEGMENTS: { key: WeightType; label: string }[] = [
    { key: 'fixed', label: 'Fixe' },
    { key: 'bodyweight', label: 'PC' },
    { key: 'bar', label: 'Barre' },
  ];

  const SET_TYPE_SEGMENTS: { key: SetType; label: string }[] = [
    { key: 'normal', label: 'Normal' },
    { key: 'amrap', label: 'AMRAP' },
  ];

  async function handleSave() {
    const dto: UpdateSetDto = {
      reps_min: isNaN(parseInt(repsMin, 10)) ? set.reps_min : parseInt(repsMin, 10),
      weight: weightDisabled ? null : (weight.trim() ? parseFloat(weight) : null),
      weight_type: weightType,
      rest_duration: parseInt(rest, 10) || 0,
      set_type: setType,
    };
    await onSave(dto);
    onClose();
  }

  return (
    <Modal transparent animationType="slide" accessibilityViewIsModal>
      <View style={[styles.overlay, { backgroundColor: MODAL_OVERLAY_COLOR }]}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>Modifier la série</Text>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            {isAmrap ? 'Minimum (0 = open AMRAP)' : 'Répétitions'}
          </Text>
          <TextInput
            style={[styles.inputFull, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={repsMin}
            onChangeText={setRepsMin}
            keyboardType="numeric"
            accessibilityLabel={isAmrap ? 'Répétitions minimum, 0 pour open AMRAP' : 'Nombre de répétitions'}
          />

          <View style={styles.segmented}>
            {SET_TYPE_SEGMENTS.map(({ key, label }) => {
              const active = setType === key;
              return (
                <PressableA11y
                  key={key}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: active }}
                  onPress={() => setSetType(key)}
                  style={[
                    styles.segment,
                    { borderColor: colors.border },
                    active ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface },
                  ]}
                >
                  <Text style={{ color: active ? colors.onPrimary : colors.text }}>{label}</Text>
                </PressableA11y>
              );
            })}
          </View>

          <View style={styles.segmented}>
            {SEGMENTS.map(({ key, label }) => {
              const active = weightType === key;
              return (
                <PressableA11y
                  key={key}
                  accessibilityLabel={label}
                  accessibilityState={{ selected: active }}
                  onPress={() => setWeightType(key)}
                  style={[
                    styles.segment,
                    { borderColor: colors.border },
                    active ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface },
                  ]}
                >
                  <Text style={{ color: active ? colors.onPrimary : colors.text }}>{label}</Text>
                </PressableA11y>
              );
            })}
          </View>

          <TextInput
            style={[
              styles.inputFull,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              weightDisabled && styles.disabled,
            ]}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            editable={!weightDisabled}
            accessibilityLabel="Poids en kilogrammes"
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Repos (s)</Text>
          <TextInput
            style={[styles.inputFull, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={rest}
            onChangeText={setRest}
            keyboardType="numeric"
            accessibilityLabel="Temps de repos en secondes"
          />
          {isDropset && (
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Enchaîner directement avec la série suivante
            </Text>
          )}

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
              style={[styles.btn, { backgroundColor: colors.primary }]}
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
  title: { fontSize: 17, fontWeight: '600' },
  fieldLabel: { fontSize: 12, fontWeight: '500', marginBottom: -8 },
  segmented: { flexDirection: 'row', gap: Spacing.sm },
  segment: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: Radius.sm, borderWidth: 1 },
  inputFull: { borderWidth: 1, borderRadius: Radius.sm, padding: Spacing.md, fontSize: 16 },
  disabled: { opacity: 0.4 },
  hint: { fontSize: 12, fontStyle: 'italic', marginTop: -8 },
  buttons: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs },
  btn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: Radius.sm },
});
