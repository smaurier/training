import { act, create } from 'react-test-renderer';
import React from 'react';
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

const MockSessionService = SessionService as jest.MockedClass<typeof SessionService>;
const MockProgramRepo = SQLiteProgramRepository as jest.MockedClass<typeof SQLiteProgramRepository>;
const MockWorkoutRepo = SQLiteWorkoutRepository as jest.MockedClass<typeof SQLiteWorkoutRepository>;
const MockSessionLogRepo = SQLiteSessionLogRepository as jest.MockedClass<typeof SQLiteSessionLogRepository>;

const workout1: Workout = { id: 1, program_id: 1, name: 'Push', order_index: 0 };
const workout2: Workout = { id: 2, program_id: 1, name: 'Pull', order_index: 1 };
const workout3: Workout = { id: 3, program_id: 1, name: 'Legs', order_index: 2 };

function setupMocks({
  activeProgram = true,
  workouts = [workout1, workout2, workout3],
  suggested = workout1,
  dates = new Map<number, string | null>(),
}: {
  activeProgram?: boolean;
  workouts?: Workout[];
  suggested?: Workout | null;
  dates?: Map<number, string | null>;
} = {}) {
  MockProgramRepo.mockImplementation(() => ({
    findAll: jest.fn().mockResolvedValue(
      activeProgram ? [{ id: 1, name: 'PPL', is_active: 1 }] : []
    ),
  } as unknown as SQLiteProgramRepository));

  MockWorkoutRepo.mockImplementation(() => ({
    findByProgramId: jest.fn().mockResolvedValue(workouts),
  } as unknown as SQLiteWorkoutRepository));

  MockSessionService.mockImplementation(() => ({
    getNextWorkout: jest.fn().mockResolvedValue(suggested),
  } as unknown as SessionService));

  MockSessionLogRepo.mockImplementation(() => ({
    findLatestDatesPerWorkout: jest.fn().mockResolvedValue(dates),
  } as unknown as SQLiteSessionLogRepository));
}

async function renderHook() {
  let result!: ReturnType<typeof useHomeWorkout>;
  function TestComponent() {
    result = useHomeWorkout();
    return null;
  }
  await act(async () => {
    create(React.createElement(TestComponent));
  });
  return { getResult: () => result };
}

describe('useHomeWorkout', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('loading est true au premier render puis false', async () => {
    let resolvePrograms!: (v: unknown[]) => void;
    MockProgramRepo.mockImplementation(() => ({
      findAll: jest.fn().mockReturnValue(new Promise(res => { resolvePrograms = res; })),
    } as unknown as SQLiteProgramRepository));
    MockWorkoutRepo.mockImplementation(() => ({ findByProgramId: jest.fn() } as unknown as SQLiteWorkoutRepository));
    MockSessionService.mockImplementation(() => ({ getNextWorkout: jest.fn() } as unknown as SessionService));
    MockSessionLogRepo.mockImplementation(() => ({ findLatestDatesPerWorkout: jest.fn() } as unknown as SQLiteSessionLogRepository));

    let capturedLoading!: boolean;
    function TestComponent() {
      const state = useHomeWorkout();
      if (!capturedLoading) capturedLoading = state.loading;
      return null;
    }
    act(() => { create(React.createElement(TestComponent)); });
    expect(capturedLoading).toBe(true);
    await act(async () => { resolvePrograms([]); });
  });

  it('hasActiveProgram est false si aucun programme actif', async () => {
    setupMocks({ activeProgram: false });
    const { getResult } = await renderHook();
    expect(getResult().hasActiveProgram).toBe(false);
    expect(getResult().workouts).toHaveLength(0);
    expect(getResult().suggestedWorkout).toBeNull();
  });

  it('retourne les workouts triés et la suggestion du cycle', async () => {
    setupMocks({ workouts: [workout2, workout1, workout3], suggested: workout2 });
    const { getResult } = await renderHook();
    expect(getResult().hasActiveProgram).toBe(true);
    expect(getResult().workouts).toHaveLength(3);
    expect(getResult().workouts[0].order_index).toBeLessThanOrEqual(getResult().workouts[1].order_index);
    expect(getResult().suggestedWorkout?.id).toBe(workout2.id);
    expect(getResult().selectedWorkout?.id).toBe(workout2.id);
    expect(getResult().isSuggestion).toBe(true);
  });

  it('selectWorkout change selectedWorkout et isSuggestion', async () => {
    setupMocks({ suggested: workout1 });
    let result!: ReturnType<typeof useHomeWorkout>;
    function TestComponent() { result = useHomeWorkout(); return null; }
    await act(async () => { create(React.createElement(TestComponent)); });
    expect(result.isSuggestion).toBe(true);

    act(() => { result.selectWorkout(workout2); });
    expect(result.selectedWorkout?.id).toBe(workout2.id);
    expect(result.isSuggestion).toBe(false);
  });

  it('expose les lastDates retournées par le repo', async () => {
    const dates = new Map([[1, '2026-01-10T10:00:00.000Z'], [2, null], [3, '2026-01-08T10:00:00.000Z']]);
    setupMocks({ dates });
    const { getResult } = await renderHook();
    expect(getResult().lastDates.get(1)).toBe('2026-01-10T10:00:00.000Z');
    expect(getResult().lastDates.get(2)).toBeNull();
  });
});
