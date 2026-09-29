import { useSyncExternalStore } from 'react';
import { params } from './params';

// Eventos online/offline reales del navegador (Playwright: context.setOffline).
const subs = new Set<() => void>();
const emit = () => subs.forEach((s) => s());
window.addEventListener('online', emit);
window.addEventListener('offline', emit);

export function isOnline(): boolean {
  return !params.netOffline && navigator.onLine;
}
export function useOnline(): boolean {
  return useSyncExternalStore(
    (l) => {
      subs.add(l);
      return () => subs.delete(l);
    },
    isOnline,
  );
}
