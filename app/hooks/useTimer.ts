import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Vibration } from 'react-native';

export interface UseTimerResult {
  remaining: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: (seconds: number) => void;
}

export function useTimer(initialSeconds: number): UseTimerResult {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const endTimeRef = useRef<number | null>(null);
  const remainingRef = useRef(initialSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = useCallback(() => {
    if (!endTimeRef.current) return;
    const left = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
    setRemaining(left);
    if (left <= 0) {
      endTimeRef.current = null;
      setIsRunning(false);
      Vibration.vibrate([0, 400, 150, 400]);
    }
  }, []);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    tick();
    intervalRef.current = setInterval(tick, 500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, tick]);

  // Recalculate when app returns to foreground
  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') tick();
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [tick]);

  const start = useCallback(() => {
    endTimeRef.current = Date.now() + remainingRef.current * 1000;
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback((seconds: number) => {
    endTimeRef.current = null;
    remainingRef.current = seconds;
    setIsRunning(false);
    setRemaining(seconds);
  }, []);

  return { remaining, isRunning, start, pause, reset };
}
