import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useHomeWorkout } from './useHomeWorkout';
import { SessionService } from '../services/SessionService';
import { SQLiteProgramRepository } from '../repositories/SQLiteProgramRepository';
import { SQLiteWorkoutRepository } from '../repositories/SQLiteWorkoutRepository';
import { SQLiteSessionLogRepository } from '../repositories/SQLiteSessionLogRepository';
import type { Workout } from '../db/types';

jest.mock('../services/SessionService');
jest.mock('../repositories/SQLiteProgramRepository');
jest.mock('../repositories/SQLiteWorkoutRepository');
jest.mock('../repositories/SQLiteSessionLogRepository');
jest.mock('../repositories/SQLiteSetLogRepository');
jest.mock('../repositories/SQLitePersonalRecordRepository');
jest.mock('../repositories/SQLiteWorkoutExerciseRepository');
jest.mock('../repositories/SQLiteBlockRepository');
jest.mock('../repositories/SQLiteSetRepository');
jest.mock('../repositories/SQLiteExerciseRepository');
jest.mock('../db');

// Fix 4: jest.MockedClass<T> typed mocks — constructors are typed, no bare `as unknown as`
const MockSessionService = SessionService as jest.MockedClass<typeof SessionService>;
const MockProgramRepo = SQLiteProgramRepository as jest.MockedClass<typeof SQLiteProgramRepository>;
const MockWorkoutRepo = SQLiteWorkoutRepository as jest.MockedClass<typeof SQLiteWorkoutRepository>;
const MockSessionLogRepo = SQLiteSessionLogRepository as jest.MockedClass<typeof SQLiteSessionLogRepository>;

const workout1: Workout = { id: 1, program_id: 1, name: 'Push', order_index: 0 };
const workout2: Workout = { id: 2, program_id: 1, name: 'Pull', order_index: 1 };
const workout3: Workout = { id: 3, program_id: 1, name: 'Legs', order_index: 2 };

// Typed partial mock helper — single `as` chain via intermediate variable avoids parser ambiguity
function partialMock<T>(impl: Partial<jest.Mocked<T>>): T {
  return impl as Partial<T> as T;
}

function setupMocks({
  activeProgram = true,
  workouts = [workout1, workout2, workout3],
  suggested = workout1 as Workout | null,
  dates = new Map<number, string | null>(),
}: {
  activeProgram?: boolean;
  workouts?: Workout[];
  suggested?: Workout | null;
  dates?: Map<number, string | null>;
} = {}) {
  MockProgramRepo.mockImplementation(() => partialMock<SQLiteProgramRepository>({
    findAll: jest.fn().mockResolvedValue(
      activeProgram ? [{ id: 1, name: 'PPL', is_active: 1 }] : []
    ),
  }));

  MockWorkoutRepo.mockImplementation(() => partialMock<SQLiteWorkoutRepository>({
    findByProgramId: jest.fn().mockResolvedValue(workouts),
  }));

  MockSessionService.mockImplementation(() => partialMock<SessionService>({
    getNextWorkout: jest.fn().mockResolvedValue(suggested),
  }));

  MockSessionLogRepo.mockImplementation(() => partialMock<SQLiteSessionLogRepository>({
    findLatestDatesPerWorkout: jest.fn().mockResolvedValue(dates),
  }));
}

describe('useHomeWorkout', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  // Fix 3: renderHook from @testing-library/react-native
  it('loading est true au premier render puis false', async () => {
    let resolvePrograms!: (v: unknown[]) => void;
    MockProgramRepo.mockImplementation(() => partialMock<SQLiteProgramRepository>({
      findAll: jest.fn().mockReturnValue(new Promise(res => { resolvePrograms = res; })),
    }));
    MockWorkoutRepo.mockImplementation(() => partialMock<SQLiteWorkoutRepository>({
      findByProgramId: jest.fn(),
    }));
    MockSessionService.mockImplementation(() => partialMock<SessionService>({
      getNextWorkout: jest.fn(),
    }));
    MockSessionLogRepo.mockImplementation(() => partialMock<SQLiteSessionLogRepository>({
      findLatestDatesPerWorkout: jest.fn(),
    }));

    const { result } = renderHook(() => useHomeWorkout());
    expect(result.current.loading).toBe(true);

    await act(async () => { resolvePrograms([]); });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('hasActiveProgram est false si aucun programme actif', async () => {
    setupMocks({ activeProgram: false });
    const { result } = renderHook(() => useHomeWorkout());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.hasActiveProgram).toBe(false);
    expect(result.current.workouts).toHaveLength(0);
    expect(result.current.suggestedWorkout).toBeNull();
  });

  it('retourne les workouts triés et la suggestion du cycle', async () => {
    setupMocks({ workouts: [workout2, workout1, workout3], suggested: workout2 });
    const { result } = renderHook(() => useHomeWorkout());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.hasActiveProgram).toBe(true);
    expect(result.current.workouts).toHaveLength(3);
    expect(result.current.workouts[0].order_index).toBeLessThanOrEqual(result.current.workouts[1].order_index);
    expect(result.current.suggestedWorkout?.id).toBe(workout2.id);
    expect(result.current.selectedWorkout?.id).toBe(workout2.id);
    expect(result.current.isSuggestion).toBe(true);
  });

  it('selectWorkout change selectedWorkout et isSuggestion', async () => {
    setupMocks({ suggested: workout1 });
    const { result } = renderHook(() => useHomeWorkout());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.isSuggestion).toBe(true);

    act(() => { result.current.selectWorkout(workout2); });
    expect(result.current.selectedWorkout?.id).toBe(workout2.id);
    expect(result.current.isSuggestion).toBe(false);
  });

  it('expose les lastDates retournées par le repo', async () => {
    const dates = new Map([[1, '2026-01-10T10:00:00.000Z'], [2, null], [3, '2026-01-08T10:00:00.000Z']]);
    setupMocks({ dates });
    const { result } = renderHook(() => useHomeWorkout());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.lastDates.get(1)).toBe('2026-01-10T10:00:00.000Z');
    expect(result.current.lastDates.get(2)).toBeNull();
  });

  // Fix 5: error-path test
  it('sets error when refresh throws', async () => {
    MockProgramRepo.mockImplementation(() => partialMock<SQLiteProgramRepository>({
      findAll: jest.fn().mockRejectedValue(new Error('DB error')),
    }));

    const { result } = renderHook(() => useHomeWorkout());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).not.toBeNull();
  });
});
