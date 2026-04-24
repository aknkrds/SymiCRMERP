import { useEffect, useMemo, useRef } from 'react';
import type { ServerEventPayload } from './useServerEvents';

type Options = {
  paths?: string[];
  debounceMs?: number;
};

export const useAutoRefreshOnServerMutation = (refresh: () => void, options?: Options) => {
  const timerRef = useRef<number | null>(null);
  const pathsRef = useRef<string[] | undefined>(options?.paths);
  const debounceMs = options?.debounceMs ?? 250;

  const pathKey = useMemo(() => (options?.paths || []).join('|'), [options?.paths]);
  useEffect(() => {
    pathsRef.current = options?.paths;
  }, [options?.paths]);

  useEffect(() => {
    const handler = (event: Event) => {
      const payload = (event as CustomEvent).detail as ServerEventPayload | undefined;
      const paths = pathsRef.current;

      if (paths && paths.length > 0) {
        const raw = payload?.path || '';
        const normalized = raw.startsWith('/api/') ? raw.slice(4) : raw;
        if (!paths.some(prefix => raw.startsWith(prefix) || normalized.startsWith(prefix))) return;
      }

      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => refresh(), debounceMs);
    };

    window.addEventListener('symi:server:mutation', handler as EventListener);
    return () => {
      window.removeEventListener('symi:server:mutation', handler as EventListener);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [refresh, debounceMs, pathKey]);
};
