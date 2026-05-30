import {
  View, Text, TextInput,
  StyleSheet, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useState, useEffect } from 'react';
import { useWorkouts } from '@/hooks/useWorkouts';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

const SUBMIT_TEXT_COLOR = '#fff' as const;

export default function AddWorkoutModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ programId: string; id?: string }>();
  const programId = Number(params.programId) || 0;
  const editId = params.id ? Number(params.id) : null;
  const isEditing = editId !== null;

  const { create, update, workouts } = useWorkouts(programId);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEditing && editId !== null) {
      const existing = workouts.find(w => w.id === editId);
      if (existing) setName(existing.name);
    }
  }, [isEditing, editId, workouts]);

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert('Champ requis', 'Le nom de la séance est obligatoire.');
      return;
    }
    if (!programId) {
      Alert.alert('Erreur', 'Programme invalide.');
      return;
    }
    try {
      setSubmitting(true);
      if (isEditing && editId !== null) {
        await update(editId, { name: name.trim() });
      } else {
        await create({ name: name.trim(), programId });
      }
      router.back();
    } catch (e) {
      setSubmitting(false);
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de sauvegarder.');
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.label, { color: colors.text }]}>Nom de la séance *</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        value={name}
        onChangeText={setName}
        placeholder="ex. Push A, Jambes, Full Body"
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel="Nom de la séance"
        autoFocus
      />

      <PressableA11y
        style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]}
        onPress={handleSubmit}
        disabled={submitting}
        accessibilityLabel={isEditing ? 'Enregistrer les modifications' : 'Créer la séance'}
        accessibilityState={{ disabled: submitting }}
      >
        {submitting
          ? <ActivityIndicator color={SUBMIT_TEXT_COLOR} />
          : <Text style={styles.submitText}>{isEditing ? 'Enregistrer' : 'Créer la séance'}</Text>
        }
      </PressableA11y>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 8 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    fontSize: 15,
    marginTop: 4,
  },
  submitBtn: {
    height: 52,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  submitText: { color: SUBMIT_TEXT_COLOR, fontSize: 16, fontWeight: '600' },
});
