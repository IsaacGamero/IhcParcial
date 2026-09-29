import { useCallback, useEffect, useRef, useState } from 'react';
import type { Kind } from './types';
import { setDraft } from './store';
import { nowISO } from './dates';

/**
 * Guardado automático del formulario sin terminar (3.5): al salir de cada campo (saveNow)
 * y cada 3 s mientras cambia. Devuelve el texto discreto de estado.
 */
export function useAutosave(kind: Kind, editingId: string | null, step: number, data: unknown, label: string) {
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const ref = useRef({ data, step, label, editingId });
  ref.current = { data, step, label, editingId };
  const dirty = useRef(false);
  const active = useRef(true);

  const saveNow = useCallback(() => {
    if (!active.current) return;
    const c = ref.current;
    setDraft(kind, { kind, editingId: c.editingId, step: c.step, data: c.data, label: c.label, updatedAt: nowISO() });
    dirty.current = false;
    setSavedAt(Date.now());
  }, [kind]);

  useEffect(() => {
    dirty.current = true;
  }, [data, step]);

  useEffect(() => {
    const t = setInterval(() => dirty.current && saveNow(), 3000);
    return () => clearInterval(t);
  }, [saveNow]);

  /** Llamar al guardar definitivamente o descartar: borra el borrador pendiente. */
  const clear = useCallback(() => {
    active.current = false;
    setDraft(kind, null);
  }, [kind]);

  const status = savedAt ? 'Guardado automáticamente hace un momento' : '';
  return { saveNow, clear, status };
}
