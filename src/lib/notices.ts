import { useSyncExternalStore } from 'react';
import { params } from './params';

// Avisos temporales (confirmaciones, errores de envío...). Con freeze=1 no desaparecen.
export interface Notice {
  id: number;
  tone: 'info' | 'success' | 'warning' | 'error' | 'neutral';
  title: string;
  text?: string;
  badge?: 'local' | 'sent';
  actions?: { label: string; onClick: () => void; primary?: boolean }[];
  sticky?: boolean;
}
let list: Notice[] = [];
let seq = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((s) => s());

export function notify(n: Omit<Notice, 'id'>, ms = 9000): number {
  const id = ++seq;
  list = [...list, { ...n, id }];
  emit();
  if (!params.freeze && !n.sticky) setTimeout(() => dismiss(id), ms);
  return id;
}
export function dismiss(id: number) {
  list = list.filter((n) => n.id !== id);
  emit();
}
export function useNotices(): Notice[] {
  return useSyncExternalStore(
    (l) => {
      subs.add(l);
      return () => subs.delete(l);
    },
    () => list,
  );
}
