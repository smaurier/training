import { useState, useEffect, useRef, useCallback } from 'react';
import { Program } from '../db/types';
import { ProgramService, CreateProgramInput, UpdateProgramInput } from '../services/ProgramService';
import { SQLiteProgramRepository } from '../repositories/SQLiteProgramRepository';
import { getDb } from '../db';

export interface UseProgramsResult {
  programs: Program[];
  loading: boolean;
  error: string | null;
  create: (input: CreateProgramInput) => Promise<void>;
  update: (id: number, input: UpdateProgramInput) => Promise<void>;
  remove: (id: number) => Promise<void>;
  setActive: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

function makeService(): ProgramService {
  return new ProgramService(new SQLiteProgramRepository(getDb()));
}

export function usePrograms(): UseProgramsResult {
  const serviceRef = useRef<ProgramService | null>(null);
  if (!serviceRef.current) serviceRef.current = makeService();
  const service = serviceRef.current;

  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await service.listAll();
      if (mountedRef.current) setPrograms(data);
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [service]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: CreateProgramInput) => {
    try {
      await service.create(input);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  const update = useCallback(async (id: number, input: UpdateProgramInput) => {
    try {
      await service.update(id, input);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  const remove = useCallback(async (id: number) => {
    try {
      await service.remove(id);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  const setActive = useCallback(async (id: number) => {
    try {
      await service.setActive(id);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  return { programs, loading, error, create, update, remove, setActive, refresh };
}
