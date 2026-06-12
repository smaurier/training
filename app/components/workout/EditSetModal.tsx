import { useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet } from 'react-native';
import type { Set as TrainingSet, WeightType } from '@/db/types';
import type { UpdateSetDto } from '@/repositories/ISetRepository';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

const MODAL_OVERLAY_COLOR = 'rgba(0,0,0,0.4)' as const;
const BTN_PRIMARY_TEXT = '#fff' as const;

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

  const weightDisabled = weightType === 'bodyweight' || weightType === 'bar';

  const SEGMENTS: { key: WeightType; label: string }[] = [
    { key: 'fixed', label: 'Fixe' },
    { key: 'bodyweight', label: 'PC' },
    { key: 'bar', label: 'Barre' },
  ];

  async function handleSave() {
    const dto: UpdateSetDto = {
      reps_min: parseInt(repsMin, 10) || set.reps_min,
      weight: weightDisabled ? null : (weight.trim() ? parseFloat(weight) : null),
      weight_type: weightType,
      rest_duration: parseInt(rest, 10) || set.rest_duration,
    };
    await onSave(dto);
    onClose();
  }

  return (
    <Modal transparent animationType="slide" accessibilityViewIsModal>
      <View style={[styles.overlay, { backgroundColor: MODAL_OVERLAY_COLOR }]}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>Modifier la série</Text>

          <TextInput
            style={[styles.inputFull, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={repsMin}
            onChangeText={setRepsMin}
            keyboardType="numeric"
            accessibilityLabel="Nombre de répétitions"
          />

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
                  <Text style={{ color: active ? BTN_PRIMARY_TEXT : colors.text }}>{label}</Text>
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

          <TextInput
            style={[styles.inputFull, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={rest}
            onChangeText={setRest}
            keyboardType="numeric"
            accessibilityLabel="Temps de repos en secondes"
          />

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
              <Text style={{ color: BTN_PRIMARY_TEXT }}>Enregistrer</Text>
            </PressableA11y>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, gap: 14 },
  title: { fontSize: 17, fontWeight: '600' },
  segmented: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.sm, borderWidth: 1 },
  inputFull: { borderWidth: 1, borderRadius: Radius.sm, padding: 10, fontSize: 16 },
  disabled: { opacity: 0.4 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  btn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: Radius.sm },
});
