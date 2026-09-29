// Parámetros de URL del modo demostración (sección 7.3 del workflow).
// Se leen de location.search; el enrutamiento usa el hash, así que sobreviven a la navegación.
const sp = new URLSearchParams(window.location.search);

export type Scenario = 'sync-ok' | 'sync-partial' | 'sync-error' | 'conflict';

export const params = {
  demo: sp.get('demo') === '1',
  reset: sp.get('reset') === '1',
  seed: (sp.get('seed') || 'base') as 'base' | 'mixed',
  today: sp.get('today'), // AAAA-MM-DD
  time: sp.get('time'), // HH:mm (opcional, hora congelada)
  netOffline: sp.get('net') === 'offline',
  scenario: (sp.get('scenario') || 'sync-ok') as Scenario,
  freeze: sp.get('freeze') === '1',
  annotate: sp.get('annotate') === '1',
  battery: sp.get('battery') ? Number(sp.get('battery')) : null,
  font: sp.get('font') as 'large' | 'xlarge' | 'normal' | null,
  pinSkip: sp.get('pin') === 'skip',
  device: (sp.get('device') || (window.innerWidth >= 1400 ? 'pc' : 'tablet')) as 'pc' | 'tablet',
  latency: sp.get('latency') ? Number(sp.get('latency')) : 700,
};

/** Quita reset=1 de la URL tras aplicarlo, para que una recarga no borre lo registrado. */
export function consumeResetParam() {
  if (!sp.has('reset')) return;
  sp.delete('reset');
  const q = sp.toString();
  const url = window.location.pathname + (q ? '?' + q : '') + window.location.hash;
  window.history.replaceState(null, '', url);
}

export const isPc = () => params.device === 'pc';
/** Verbo de interacción según dispositivo: "Toca" en tableta, "Haz clic" en computadora. */
export const tap = (cap = true) => (isPc() ? (cap ? 'Haz clic' : 'haz clic') : cap ? 'Toca' : 'toca');
