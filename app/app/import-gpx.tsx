import { useState, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import { getDb } from '@/db';
import { GpxImportService, parseGpxFile, type GpxData } from '@/services/GpxImportService';
import { SQLiteProgramRepository } from '@/repositories/SQLiteProgramRepository';
import { SQLiteWorkoutRepository } from '@/repositories/SQLiteWorkoutRepository';
import { SQLiteExerciseRepository } from '@/repositories/SQLiteExerciseRepository';
import { SQLiteWorkoutExerciseRepository } from '@/repositories/SQLiteWorkoutExerciseRepository';
import { SQLiteBlockRepository } from '@/repositories/SQLiteBlockRepository';
import { SQLiteSetRepository } from '@/repositories/SQLiteSetRepository';
import { SQLiteSessionLogRepository } from '@/repositories/SQLiteSessionLogRepository';
import { SQLiteSetLogRepository } from '@/repositories/SQLiteSetLogRepository';

function makeGpxService(): GpxImportService {
  const db = getDb();
  return new GpxImportService(
    new SQLiteProgramRepository(db),
    new SQLiteWorkoutRepository(db),
    new SQLiteExerciseRepository(db),
    new SQLiteWorkoutExerciseRepository(db),
    new SQLiteBlockRepository(db),
    new SQLiteSetRepository(db),
    new SQLiteSessionLogRepository(db),
    new SQLiteSetLogRepository(db),
  );
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h} h ${m > 0 ? `${m} min` : ''}`.trim();
  return m > 0 ? `${m} min ${s > 0 ? `${s} s` : ''}`.trim() : `${s} s`;
}

export default function ImportGpxScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [gpxData, setGpxData] = useState<GpxData | null>(null);
  const [distanceKmEdited, setDistanceKmEdited] = useState('');
  const [selectedRpe, setSelectedRpe] = useState<3 | 6 | 9 | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePickFile = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['*/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || result.assets.length === 0) return;
    const uri = result.assets[0].uri;
    try {
      const content = await FileSystem.readAsStringAsync(uri);
      const data = parseGpxFile(content);
      setGpxData(data);
      setDistanceKmEdited((data.distanceMeters / 1000).toFixed(2));
      setSelectedRpe(null);
    } catch {
      Alert.alert('Erreur', 'Impossible de lire ce fichier GPX.');
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!gpxData) return;
    setLoading(true);
    try {
      const km = parseFloat(distanceKmEdited || '0');
      const dataWithEditedDistance: GpxData = {
        ...gpxData,
        distanceMeters: km > 0 ? Math.round(km * 1000) : gpxData.distanceMeters,
      };
      await makeGpxService().importParsed(dataWithEditedDistance, selectedRpe);
      router.replace('/(tabs)/progression' as any);
    } catch {
      Alert.alert('Erreur', "L'import a échoué. Vérifiez le fichier et réessayez.");
      setLoading(false);
    }
  }, [gpxData, distanceKmEdited, selectedRpe, router]);

  const handleReset = useCallback(() => {
    setGpxData(null);
    setDistanceKmEdited('');
    setSelectedRpe(null);
  }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: colors.text }]}>Importer un footing</Text>

      {!gpxData ? (
        <PressableA11y
          accessibilityLabel="Choisir un fichier GPX"
          onPress={handlePickFile}
          style={[styles.pickBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.pickBtnText}>Choisir un fichier .gpx</Text>
        </PressableA11y>
      ) : (
        <View style={styles.preview}>
          <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>DATE</Text>
            <Text style={[styles.previewValue, { color: colors.text }]}>
              {new Date(gpxData.startedAt).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </Text>
          </View>

          <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>DURÉE</Text>
            <Text style={[styles.previewValue, { color: colors.text }]}>{formatDuration(gpxData.durationSeconds)}</Text>
          </View>

          <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>DISTANCE (km)</Text>
            <TextInput
              style={[styles.distanceInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={distanceKmEdited}
              onChangeText={setDistanceKmEdited}
              keyboardType="decimal-pad"
              maxLength={6}
              accessibilityLabel="Distance en kilomètres"
            />
          </View>

          <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>SENSATION (optionnel)</Text>
            <View style={styles.rpeRow}>
              {([
                { rpe: 3 as const, label: 'Léger' },
                { rpe: 6 as const, label: 'Normal' },
                { rpe: 9 as const, label: 'Difficile' },
              ] as const).map(({ rpe, label }) => (
                <PressableA11y
                  key={rpe}
                  accessibilityLabel={`Sensation : ${label}`}
                  accessibilityState={{ selected: selectedRpe === rpe }}
                  onPress={() => setSelectedRpe(selectedRpe === rpe ? null : rpe)}
                  style={[
                    styles.rpeChip,
                    { borderColor: colors.border },
                    selectedRpe === rpe ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface },
                  ]}
                >
                  <Text style={[styles.rpeLabel, { color: selectedRpe === rpe ? '#fff' : colors.text }]}>{label}</Text>
                </PressableA11y>
              ))}
            </View>
          </View>

          <PressableA11y
            accessibilityLabel="Importer cette séance"
            onPress={handleImport}
            disabled={loading}
            style={[styles.importBtn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
          >
            <Text style={styles.importBtnText}>{loading ? 'Import…' : 'Importer'}</Text>
          </PressableA11y>

          <PressableA11y
            accessibilityLabel="Annuler et choisir un autre fichier"
            onPress={handleReset}
            style={[styles.cancelBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Annuler</Text>
          </PressableA11y>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  pickBtn: { paddingVertical: 16, borderRadius: Radius.sm, alignItems: 'center' },
  pickBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  preview: { gap: 12 },
  previewCard: { borderWidth: 1, borderRadius: Radius.sm, padding: 16, gap: 8 },
  previewLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  previewValue: { fontSize: 18, fontWeight: '600' },
  distanceInput: { borderWidth: 1, borderRadius: Radius.sm, padding: 10, fontSize: 18, fontWeight: '600' },
  rpeRow: { flexDirection: 'row', gap: 8 },
  rpeChip: { flex: 1, borderWidth: 1, borderRadius: Radius.sm, paddingVertical: 10, alignItems: 'center' },
  rpeLabel: { fontSize: 13, fontWeight: '500' },
  importBtn: { paddingVertical: 16, borderRadius: Radius.sm, alignItems: 'center', marginTop: 8 },
  importBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  cancelBtn: { paddingVertical: 14, borderRadius: Radius.sm, alignItems: 'center', borderWidth: 1 },
  cancelBtnText: { fontSize: 15 },
});
