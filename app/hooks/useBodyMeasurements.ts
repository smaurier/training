import { useState, useEffect, useRef, useCallback } from 'react';
import { BodyMeasurementService } from '../services/BodyMeasurementService';
import { SQLiteBodyMeasurementRepository } from '../repositories/SQLiteBodyMeasurementRepository';
import { getDb } from '../db';
import type { BodyMeasurement, CreateBodyMeasurementDto } from '../db/types';

function makeService() {
  return new BodyMeasurementService(new SQLiteBodyMeasurementRepository(getDb()));
}

export function useBodyMeasurements() {
  const serviceRef = useRef<BodyMeasurementService | null>(null);
  if (serviceRef.current == null) serviceRef.current = makeService();
  const service = serviceRef.current;

  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [latest, setLatest] = useState<BodyMeasurement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [all, lat] = await Promise.all([service.getHistory(), service.getLatest()]);
      if (mountedRef.current) {
        setMeasurements(all);
        setLatest(lat);
      }
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [service]);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback(async (dto: CreateBodyMeasurementDto) => {
    await service.save(dto);
    await refresh();
  }, [service, refresh]);

  return { measurements, latest, isLoading, error, refresh, save };
}
