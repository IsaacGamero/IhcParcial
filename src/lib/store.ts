import { useSyncExternalStore } from 'react';
import type { Actividad, Actuacion, Caso, DB, FormDraft, Kind, Meta } from './types';
import { buildSeed } from './seed';
import { nowISO, yyyymm } from './dates';
import { params, consumeResetParam } from './params';

// Persistencia en la tableta: localStorage (sección 1.2). Sin backend.
const KEY = 'jc-db-v1';

let db: DB = load();
const listeners = new Set<() => void>();

function load(): DB {
  if (params.reset) {
    const fresh = buildSeed(params.seed);
    localStorage.setItem(KEY, JSON.stringify(fresh));
    sessionStorage.clear();
    consumeResetParam();
    return fresh;
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch {
    /* datos corruptos: se vuelve a la semilla */
  }
  const fresh = buildSeed(params.seed);
  localStorage.setItem(KEY, JSON.stringify(fresh));
  return fresh;
}

function commit(next: DB) {
  db = next;
  localStorage.setItem(KEY, JSON.stringify(db));
  listeners.forEach((l) => l());
}

export function getDB(): DB {
  return db;
}
export function setDB(fn: (d: DB) => DB) {
  commit(fn(db));
}
export function useDB(): DB {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => db,
  );
}
export function resetDB(seed: 'base' | 'mixed' = 'base') {
  commit(buildSeed(seed));
}

export const uid = () => Math.random().toString(36).slice(2, 10);

/** Código generado sin conexión con prefijo de tableta: JZ04-TAB01-202605-0013 */
export function nextCode(kind: Kind): string {
  const m = db.meta;
  const n = m.counters[kind] + 1;
  commit({ ...db, meta: { ...m, counters: { ...m.counters, [kind]: n } } });
  const corr = String(n).padStart(4, '0');
  const tab = `TAB${m.tableta}`;
  if (kind === 'caso') return `JZ${m.juzgado}-${tab}-${yyyymm()}-${corr}`;
  if (kind === 'actuacion') return `NOT-${tab}-${yyyymm()}-${corr}`;
  return `AGE-${tab}-${yyyymm()}-${corr}`;
}
/** Vista previa del próximo código sin consumirlo. */
export function peekCode(kind: Kind): string {
  const m = db.meta;
  const corr = String(m.counters[kind] + 1).padStart(4, '0');
  const tab = `TAB${m.tableta}`;
  if (kind === 'caso') return `JZ${m.juzgado}-${tab}-${yyyymm()}-${corr}`;
  if (kind === 'actuacion') return `NOT-${tab}-${yyyymm()}-${corr}`;
  return `AGE-${tab}-${yyyymm()}-${corr}`;
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [item, ...list];
  const copy = list.slice();
  copy[i] = item;
  return copy;
}

/** Todo guardado vuelve a "En la tableta" hasta que se envíe. */
export function saveCase(c: Caso) {
  const item = { ...c, sync: 'local' as const, updatedAt: nowISO() };
  setDB((d) => ({ ...d, cases: upsert(d.cases, item) }));
  return item;
}
export function saveActuacion(a: Actuacion) {
  const item = { ...a, sync: 'local' as const, updatedAt: nowISO() };
  setDB((d) => ({ ...d, actuaciones: upsert(d.actuaciones, item) }));
  return item;
}
export function saveActividad(a: Actividad) {
  const item = { ...a, sync: 'local' as const, updatedAt: nowISO() };
  setDB((d) => ({ ...d, actividades: upsert(d.actividades, item) }));
  return item;
}

export function setDraft(kind: Kind, draft: FormDraft | null) {
  setDB((d) => {
    const drafts = { ...d.drafts };
    if (draft) drafts[kind] = draft;
    else delete drafts[kind];
    return { ...d, drafts };
  });
}

export function setMeta(patch: Partial<Meta>) {
  setDB((d) => ({ ...d, meta: { ...d.meta, ...patch } }));
}

export interface PendingRecord {
  kind: Kind;
  id: string;
  codigo: string;
  label: string;
}
/** Registros por enviar = sincronización pendiente. */
export function pendingRecords(d: DB = db): PendingRecord[] {
  const out: PendingRecord[] = [];
  d.cases.forEach((c) => c.sync !== 'sent' && out.push({ kind: 'caso', id: c.id, codigo: c.codigo, label: 'Caso' }));
  d.actuaciones.forEach((a) => a.sync !== 'sent' && out.push({ kind: 'actuacion', id: a.id, codigo: a.codigo, label: 'Trámite' }));
  d.actividades.forEach((a) => a.sync !== 'sent' && out.push({ kind: 'actividad', id: a.id, codigo: a.codigo, label: a.titulo || 'Actividad' }));
  return out;
}
