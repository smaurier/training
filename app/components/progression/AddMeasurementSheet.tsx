import { Spacing } from '@/constants/Spacing';
import { useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { Radius } from '@/constants/Radius';
import { useColorScheme } from '@/components/useColorScheme';
import type { CreateBodyMeasurementDto } from '@/db/types';

interface Props {
  onSave: (dto: CreateBodyMeasurementDto) => Promise<void>;
  useKg?: boolean;
}

export interface AddMeasurementSheetRef {
  expand: () => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export const AddMeasurementSheet = forwardRef<AddMeasurementSheetRef, Props>(
  function AddMeasurementSheet({ onSave, useKg = true }, ref) {
    const sheetRef = useRef<BottomSheet>(null);

    useImperativeHandle(ref, () => ({
      expand: () => sheetRef.current?.expand(),
    }));

    const colors = Colors[useColorScheme() ?? 'light'];

    const [date, setDate] = useState(todayISO());
    const [weight, setWeight] = useState('');
    const [waist, setWaist] = useState('');
    const [arm, setArm] = useState('');
    const [thigh, setThigh] = useState('');
    const [hip, setHip] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const weightLabel = useKg ? 'Poids (kg)' : 'Poids (lbs)';
    const circumLabel = useKg ? 'cm' : 'in';

    const parseOptional = (v: string): number | null => {
      const n = parseFloat(v.replace(',', '.'));
      return isNaN(n) ? null : n;
    };

    const handleSave = useCallback(async () => {
      if (isSaving) return;
      setIsSaving(true);
      try {
        await onSave({
          date,
          weight_kg: parseOptional(weight),
          waist_cm: parseOptional(waist),
          arm_cm: parseOptional(arm),
          thigh_cm: parseOptional(thigh),
          hip_cm: parseOptional(hip),
        });
        setWeight('');
        setWaist('');
        setArm('');
        setThigh('');
        setHip('');
        setDate(todayISO());
        sheetRef.current?.close();
      } finally {
        setIsSaving(false);
      }
    }, [isSaving, onSave, date, weight, waist, arm, thigh, hip]);

    const field = (
      label: string,
      value: string,
      setter: (v: string) => void,
      a11yLabel: string
    ) => (
      <View style={styles.fieldRow}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
          {label}
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
          value={value}
          onChangeText={setter}
          keyboardType="decimal-pad"
          placeholder="—"
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel={a11yLabel}
        />
      </View>
    );

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={['70%']}
        enablePanDownToClose
      >
        <BottomSheetScrollView
          contentContainerStyle={[
            styles.container,
            { backgroundColor: colors.surface },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            Ajouter une mesure
          </Text>

          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Date
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel="Date de la mesure"
            />
          </View>

          {field(weightLabel, weight, setWeight, `Valeur ${weightLabel}`)}
          {field(
            `Tour de taille (${circumLabel})`,
            waist,
            setWaist,
            `Tour de taille en ${circumLabel}`
          )}
          {field(
            `Tour de bras (${circumLabel})`,
            arm,
            setArm,
            `Tour de bras en ${circumLabel}`
          )}
          {field(
            `Tour de cuisse (${circumLabel})`,
            thigh,
            setThigh,
            `Tour de cuisse en ${circumLabel}`
          )}
          {field(
            `Tour de hanches (${circumLabel})`,
            hip,
            setHip,
            `Tour de hanches en ${circumLabel}`
          )}

          <PressableA11y
            onPress={handleSave}
            disabled={isSaving}
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            accessibilityLabel="Enregistrer la mesure"
            accessibilityRole="button"
          >
            <Text style={[styles.saveBtnText, { color: colors.onPrimary }]}>
              {isSaving ? 'Enregistrement…' : 'Enregistrer'}
            </Text>
          </PressableA11y>
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  container: { padding: Spacing.xl, paddingBottom: 40 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: Spacing.xl },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  fieldLabel: { fontSize: 14, flex: 1 },
  input: {
    flex: 0,
    width: 110,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 14,
    textAlign: 'right',
  },
  saveBtn: { marginTop: Spacing.xxl, padding: Spacing.lg, borderRadius: Radius.lg, alignItems: 'center' },
  saveBtnText: { fontWeight: '700', fontSize: 16 },
});
