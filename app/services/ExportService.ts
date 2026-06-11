import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';
import appJson from '../app.json';

export class ExportService {
  constructor(private readonly db: SQLiteDatabase) {}

  async exportAll(): Promise<void> {
    const [
      exercises,
      programs,
      workouts,
      workoutExercises,
      blocks,
      sets,
      sessionLogs,
      setLogs,
      settings,
    ] = await Promise.all([
      this.db.getAllAsync('SELECT * FROM exercises'),
      this.db.getAllAsync('SELECT * FROM programs'),
      this.db.getAllAsync('SELECT * FROM workouts'),
      this.db.getAllAsync('SELECT * FROM workout_exercises'),
      this.db.getAllAsync('SELECT * FROM blocks'),
      this.db.getAllAsync('SELECT * FROM sets'),
      this.db.getAllAsync('SELECT * FROM session_logs'),
      this.db.getAllAsync('SELECT * FROM set_logs'),
      this.db.getAllAsync('SELECT * FROM settings'),
    ]);

    const now = new Date().toISOString();
    const dateStr = now.slice(0, 10);

    const payload = JSON.stringify(
      {
        exportedAt: now,
        appVersion: appJson.expo.version,
        schema: 7,
        data: {
          exercises,
          programs,
          workouts,
          workoutExercises,
          blocks,
          sets,
          sessionLogs,
          setLogs,
          settings,
        },
      },
      null,
      2,
    );

    const uri = `${FileSystem.cacheDirectory}training-export-${dateStr}.json`;
    await FileSystem.writeAsStringAsync(uri, payload, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const available = await Sharing.isAvailableAsync();
    if (!available) {
      throw new Error("Le partage de fichiers n'est pas disponible sur cet appareil.");
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: "Exporter mes données d'entraînement",
    });
  }
}
