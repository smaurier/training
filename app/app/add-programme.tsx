import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { usePrograms } from '@/hooks/usePrograms';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function AddProgrammeModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id ? Number(params.id) : null;
  const isEditing = editId !== null;

  const { create, update, programs } = usePrograms();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEditing && editId !== null) {
      const existing = programs.find(p => p.id === editId);
      if (existing) {
        setName(existing.name);
        setDescription(existing.description ?? '');
      }
    }
  }, [isEditing, editId, programs]);

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert('Champ requis', 'Le nom du programme est obligatoire.');
      return;
    }
    try {
      setSubmitting(true);
      if (isEditing && editId !== null) {
        await update(editId, { name: name.trim(), description: description.trim() || null });
      } else {
        await create({ name: name.trim(), description: description.trim() || null });
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
      <Text style={[styles.label, { color: colors.text }]}>Nom *</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        value={name}
        onChangeText={setName}
        placeholder="ex. Push / Pull / Legs"
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel="Nom du programme"
        autoFocus
      />

      <Text style={[styles.label, { color: colors.text }]}>Description</Text>
      <TextInput
        style={[styles.input, styles.inputMultiline, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        value={description}
        onChangeText={setDescription}
        placeholder="ex. Programme hypertrophie 4 jours"
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel="Description du programme"
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]}
        onPress={handleSubmit}
        disabled={submitting}
        accessibilityLabel={isEditing ? 'Enregistrer les modifications' : 'Créer le programme'}
        accessibilityRole="button"
      >
        {submitting
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitText}>{isEditing ? 'Enregistrer' : 'Créer le programme'}</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 8 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    marginTop: 4,
  },
  inputMultiline: {
    height: 88,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  submitBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
