import { ExportService } from './ExportService';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/cache/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  EncodingType: { UTF8: 'utf8' },
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockDb = {
  getAllAsync: jest.fn().mockResolvedValue([]),
};

describe('ExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockDb.getAllAsync as jest.Mock).mockResolvedValue([]);
  });

  describe('exportAll', () => {
    it('assembles JSON with all required top-level keys and data sections', async () => {
      const service = new ExportService(mockDb as any);
      await service.exportAll();

      const [[, content]] = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls;
      const parsed = JSON.parse(content as string);

      expect(parsed).toMatchObject({
        exportedAt: expect.any(String),
        appVersion: expect.any(String),
        schema: 7,
        data: {
          exercises: [],
          programs: [],
          workouts: [],
          workoutExercises: [],
          blocks: [],
          sets: [],
          sessionLogs: [],
          setLogs: [],
          settings: [],
        },
      });
    });

    it('calls Sharing.shareAsync with a URI containing training-export', async () => {
      const service = new ExportService(mockDb as any);
      await service.exportAll();

      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        expect.stringContaining('training-export'),
        expect.any(Object),
      );
    });

    it('throws if sharing is not available', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);

      const service = new ExportService(mockDb as any);
      await expect(service.exportAll()).rejects.toThrow('partage');
    });
  });
});
