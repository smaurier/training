import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { getDb } from '@/db';
import { ShareProgramService } from '@/services/ShareProgramService';
import { SQLiteProgramRepository } from '@/repositories/SQLiteProgramRepository';
import { SQLiteWorkoutRepository } from '@/repositories/SQLiteWorkoutRepository';
import { SQLiteWorkoutExerciseRepository } from '@/repositories/SQLiteWorkoutExerciseRepository';
import { SQLiteBlockRepository } from '@/repositories/SQLiteBlockRepository';
import { SQLiteSetRepository } from '@/repositories/SQLiteSetRepository';
import { SQLiteExerciseRepository } from '@/repositories/SQLiteExerciseRepository';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

function makeService() {
  const db = getDb();
  return new ShareProgramService(
    new SQLiteProgramRepository(db),
    new SQLiteWorkoutRepository(db),
    new SQLiteWorkoutExerciseRepository(db),
    new SQLiteBlockRepository(db),
    new SQLiteSetRepository(db),
    new SQLiteExerciseRepository(db),
  );
}

export default function ScanProgrammeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();
  const colors = Colors[useColorScheme() ?? 'light'];

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission, requestPermission]);

  async function handleBarcodeScanned({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);
    try {
      const url = new URL(data);
      const base64 = url.searchParams.get('data');
      if (!base64) throw new Error('QR invalide');

      const svc = makeService();
      const programId = await svc.importPayload(base64);
      router.replace(`/programme/${programId}`);
    } catch {
      Alert.alert('Erreur', 'QR code invalide ou programme corrompu.', [
        { text: 'Réessayer', onPress: () => setScanned(false) },
        { text: 'Annuler', onPress: () => router.back() },
      ]);
    }
  }

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.msg, { color: colors.text }]}>
          Autorise l'accès à la caméra dans les Réglages de ton téléphone.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />
      <View style={styles.overlay}>
        <Text style={styles.hint}>Pointe la caméra vers le QR code du programme</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    position: 'absolute', bottom: 60, left: 0, right: 0,
    alignItems: 'center', paddingHorizontal: 24,
  },
  hint: {
    color: '#fff', fontSize: 15, textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
  },
  msg: { fontSize: 16, textAlign: 'center', margin: 32 },
});
