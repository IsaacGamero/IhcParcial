import { useSyncExternalStore } from 'react';

// Enrutamiento con hash (#/casos/:id) para que GitHub Pages no dé 404 al recargar.
const subs = new Set<() => void>();
window.addEventListener('hashchange', () => subs.forEach((s) => s()));

function current(): string {
  const h = window.location.hash.replace(/^#/, '');
  return h || '/';
}
export function useRoute(): { path: string; parts: string[]; query: URLSearchParams } {
  const full = useSyncExternalStore(
    (l) => {
      subs.add(l);
      return () => subs.delete(l);
    },
    current,
  );
  const [path, q = ''] = full.split('?');
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(q) };
}
export function navigate(path: string) {
  window.location.hash = path;
  window.scrollTo(0, 0);
}
export function back() {
  window.history.back();
}
