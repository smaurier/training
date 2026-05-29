import { useState, useEffect, useRef, useCallback } from 'react';

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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          setIsRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback((seconds: number) => {
    setIsRunning(false);
    setRemaining(seconds);
  }, []);

  return { remaining, isRunning, start, pause, reset };
}
