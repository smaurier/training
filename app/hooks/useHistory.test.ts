import { act, create } from 'react-test-renderer';
import React from 'react';
import { useHistory } from './useHistory';
import { HistoryService } from '../services/HistoryService';
import type { SessionSummary } from '../services/HistoryService';

// Mock the entire HistoryService module
jest.mock('../services/HistoryService');
// Mock dependencies used in makeService()
jest.mock('../repositories/SQLiteSessionLogRepository');
jest.mock('../repositories/SQLiteSetLogRepository');
jest.mock('../repositories/SQLiteWorkoutRepository');
jest.mock('../repositories/SQLiteExerciseRepository');
jest.mock('../db');

const MockHistoryService = HistoryService as jest.MockedClass<typeof HistoryService>;

// Minimal renderHook using react-test-renderer
function renderHook<T>(useHook: () => T): { getResult: () => T } {
  let result!: T;

  function TestComponent() {
    result = useHook();
    return null;
  }

  act(() => {
    create(React.createElement(TestComponent));
  });

  return { getResult: () => result };
}

function makeSummary(overrides: Partial<SessionSummary> & { startedAt: string }): SessionSummary {
  return {
    id: 1,
    workoutName: 'Push A',
    durationSeconds: 2700,
    totalSets: 10,
    ...overrides,
  };
}

describe('useHistory', () => {
  let mockGetSessionList: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSessionList = jest.fn().mockResolvedValue([]);
    MockHistoryService.mockImplementation(() => ({
      getSessionList: mockGetSessionList,
      getSessionDetail: jest.fn(),
    } as unknown as HistoryService));
  });

  it('isLoading est true et sections est [] avant le chargement', async () => {
    let resolvePromise!: (value: SessionSummary[]) => void;
    mockGetSessionList.mockReturnValue(new Promise(res => { resolvePromise = res; }));

    let hookResult!: ReturnType<typeof useHistory>;
    // Capture initial render state before async resolves
    const renders: Array<{ isLoading: boolean; sections: unknown }> = [];

    function TestComponent() {
      hookResult = useHistory();
      renders.push({ isLoading: hookResult.isLoading, sections: hookResult.sections });
      return null;
    }

    // Synchronous render — captures initial state
    act(() => {
      create(React.createElement(TestComponent));
    });

    // First render should have isLoading=true and sections=[]
    expect(renders[0].isLoading).toBe(true);
    expect(renders[0].sections).toEqual([]);

    // Resolve pending promise cleanly
    await act(async () => { resolvePromise([]); });
  });

  it('sections est [] après le chargement avec 0 sessions', async () => {
    mockGetSessionList.mockResolvedValue([]);

    let hookResult!: ReturnType<typeof useHistory>;

    function TestComponent() {
      hookResult = useHistory();
      return null;
    }

    await act(async () => {
      create(React.createElement(TestComponent));
    });

    expect(hookResult.isLoading).toBe(false);
    expect(hookResult.sections).toEqual([]);
    expect(hookResult.error).toBeNull();
  });

  it('regroupe en 1 section quand toutes les sessions sont dans le même mois', async () => {
    const sessions: SessionSummary[] = [
      makeSummary({ id: 1, startedAt: '2026-05-10T10:00:00.000Z' }),
      makeSummary({ id: 2, startedAt: '2026-05-20T10:00:00.000Z' }),
      makeSummary({ id: 3, startedAt: '2026-05-28T10:00:00.000Z' }),
    ];
    mockGetSessionList.mockResolvedValue(sessions);

    let hookResult!: ReturnType<typeof useHistory>;

    function TestComponent() {
      hookResult = useHistory();
      return null;
    }

    await act(async () => {
      create(React.createElement(TestComponent));
    });

    expect(hookResult.sections).toHaveLength(1);
    expect(hookResult.sections[0].data).toHaveLength(3);
  });

  it('regroupe en 2 sections DESC quand sessions sur 2 mois différents', async () => {
    const sessions: SessionSummary[] = [
      makeSummary({ id: 1, startedAt: '2026-04-15T10:00:00.000Z' }),
      makeSummary({ id: 2, startedAt: '2026-05-10T10:00:00.000Z' }),
      makeSummary({ id: 3, startedAt: '2026-05-20T10:00:00.000Z' }),
    ];
    mockGetSessionList.mockResolvedValue(sessions);

    let hookResult!: ReturnType<typeof useHistory>;

    function TestComponent() {
      hookResult = useHistory();
      return null;
    }

    await act(async () => {
      create(React.createElement(TestComponent));
    });

    expect(hookResult.sections).toHaveLength(2);
    // DESC : mai 2026 avant avril 2026
    expect(hookResult.sections[0].title).toMatch(/Mai 2026/);
    expect(hookResult.sections[1].title).toMatch(/Avril 2026/);
  });

  it('formate le titre : "Mai 2026 · 3 séances"', async () => {
    const sessions: SessionSummary[] = [
      makeSummary({ id: 1, startedAt: '2026-05-10T10:00:00.000Z' }),
      makeSummary({ id: 2, startedAt: '2026-05-15T10:00:00.000Z' }),
      makeSummary({ id: 3, startedAt: '2026-05-28T10:00:00.000Z' }),
    ];
    mockGetSessionList.mockResolvedValue(sessions);

    let hookResult!: ReturnType<typeof useHistory>;

    function TestComponent() {
      hookResult = useHistory();
      return null;
    }

    await act(async () => {
      create(React.createElement(TestComponent));
    });

    expect(hookResult.sections[0].title).toBe('Mai 2026 · 3 séances');
  });

  it('formate le titre au singulier : "Mai 2026 · 1 séance"', async () => {
    const sessions: SessionSummary[] = [
      makeSummary({ id: 1, startedAt: '2026-05-10T10:00:00.000Z' }),
    ];
    mockGetSessionList.mockResolvedValue(sessions);

    let hookResult!: ReturnType<typeof useHistory>;

    function TestComponent() {
      hookResult = useHistory();
      return null;
    }

    await act(async () => {
      create(React.createElement(TestComponent));
    });

    expect(hookResult.sections[0].title).toBe('Mai 2026 · 1 séance');
  });

  it('error est défini quand le service lance une exception', async () => {
    mockGetSessionList.mockRejectedValue(new Error('DB error'));

    let hookResult!: ReturnType<typeof useHistory>;

    function TestComponent() {
      hookResult = useHistory();
      return null;
    }

    await act(async () => {
      create(React.createElement(TestComponent));
    });

    expect(hookResult.error).toBe('DB error');
    expect(hookResult.isLoading).toBe(false);
    expect(hookResult.sections).toEqual([]);
  });

  it('refresh() recharge les données', async () => {
    const initial: SessionSummary[] = [
      makeSummary({ id: 1, startedAt: '2026-05-10T10:00:00.000Z' }),
    ];
    const updated: SessionSummary[] = [
      makeSummary({ id: 1, startedAt: '2026-05-10T10:00:00.000Z' }),
      makeSummary({ id: 2, startedAt: '2026-05-20T10:00:00.000Z' }),
    ];
    mockGetSessionList
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(updated);

    let hookResult!: ReturnType<typeof useHistory>;

    function TestComponent() {
      hookResult = useHistory();
      return null;
    }

    await act(async () => {
      create(React.createElement(TestComponent));
    });

    expect(hookResult.sections[0].data).toHaveLength(1);

    await act(async () => {
      await hookResult.refresh();
    });

    expect(hookResult.sections[0].data).toHaveLength(2);
    expect(mockGetSessionList).toHaveBeenCalledTimes(2);
  });
});
