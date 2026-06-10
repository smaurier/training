import { renderHook, act } from '@testing-library/react-native';
import { Vibration } from 'react-native';
import { useTimer } from './useTimer';

jest.useFakeTimers();

describe('useTimer', () => {
  beforeEach(() => {
    // jest-expo provides Vibration as {} — install vibrate so useTimer can call it
    (Vibration as unknown as Record<string, unknown>).vibrate = jest.fn();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('counts down after reset then start', () => {
    const { result } = renderHook(() => useTimer(120));

    act(() => {
      result.current.reset(5);
    });
    expect(result.current.remaining).toBe(5);

    act(() => {
      result.current.start();
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.remaining).toBeLessThan(5);
    expect(result.current.isRunning).toBe(true);
  });

  it('stops when reaching zero', () => {
    const { result } = renderHook(() => useTimer(120));

    act(() => {
      result.current.reset(2);
      result.current.start();
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.remaining).toBe(0);
    expect(result.current.isRunning).toBe(false);
  });

  it('reset and start are stable references across renders', () => {
    const { result, rerender } = renderHook(() => useTimer(120));
    const resetRef1 = result.current.reset;
    const startRef1 = result.current.start;

    act(() => {
      result.current.reset(10);
    });
    rerender({});

    expect(result.current.reset).toBe(resetRef1);
    expect(result.current.start).toBe(startRef1);
  });
});
