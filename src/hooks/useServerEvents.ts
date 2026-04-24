import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export type ServerEventPayload = {
  type: string;
  method?: string;
  path?: string;
  at?: string;
  ms?: number;
};

export const useServerEvents = () => {
  const { user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;

    const es = new EventSource('/api/events');

    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data) as ServerEventPayload;
        window.dispatchEvent(new CustomEvent('symi:server:mutation', { detail: payload }));
      } catch { }
    };

    es.addEventListener('connected', (e) => {
      try {
        const payload = JSON.parse((e as MessageEvent).data) as ServerEventPayload;
        window.dispatchEvent(new CustomEvent('symi:server:connected', { detail: payload }));
      } catch { }
    });

    return () => es.close();
  }, [userId]);
};
