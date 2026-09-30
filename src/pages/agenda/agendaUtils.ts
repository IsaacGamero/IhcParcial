// OWNER: agente-agenda — utilidades compartidas por Inicio y Agenda.
import type { Actividad, Categoria, DB } from '../../lib/types';
import { addDays, parseISODate, todayISO } from '../../lib/dates';

export type Vista = 'mes' | 'semana' | 'dia';

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Orden por fecha y hora (sin hora fija al final del día). */
export function byDateTime(a: Actividad, b: Actividad) {
  const ka = a.fecha + (a.sinHora || !a.horaInicio ? '~' : a.horaInicio);
  const kb = b.fecha + (b.sinHora || !b.horaInicio ? '~' : b.horaInicio);
  return ka.localeCompare(kb);
}

export function activitiesOn(db: DB, iso: string): Actividad[] {
  return db.actividades.filter((a) => a.fecha === iso).sort(byDateTime);
}

/** "9:00" */
export function hm(t: string) {
  return t ? t.replace(/^0(\d)/, '$1') : '';
}
/** "9:00–10:00" o "Sin hora fija" */
export function timeRange(a: Actividad) {
  if (a.sinHora || !a.horaInicio) return 'Sin hora fija';
  return a.horaFin ? `${hm(a.horaInicio)}–${hm(a.horaFin)}` : hm(a.horaInicio);
}

export function vinculoInfo(db: DB, a: Actividad): { label: string; href: string } | null {
  if (!a.vinculo) return null;
  if (a.vinculo.tipo === 'caso') {
    const c = db.cases.find((x) => x.id === a.vinculo!.id);
    return c ? { label: `Caso ${c.codigo}`, href: `#/casos/${c.id}` } : null;
  }
  const t = db.actuaciones.find((x) => x.id === a.vinculo!.id);
  return t ? { label: `Trámite ${t.codigo}`, href: `#/actuaciones/${t.id}` } : null;
}

/** Personas vinculadas: las de la actividad y las del caso o trámite enlazado. */
function people(db: DB, a: Actividad): string[] {
  const out = [...a.personas];
  if (a.vinculo?.tipo === 'caso') db.cases.find((c) => c.id === a.vinculo!.id)?.partes.forEach((p) => out.push(p.nombre));
  if (a.vinculo?.tipo === 'actuacion') db.actuaciones.find((c) => c.id === a.vinculo!.id)?.participantes.forEach((p) => out.push(p.nombre));
  return out;
}

/** Búsqueda por título, comunidad o persona vinculada. */
export function matches(db: DB, a: Actividad, q: string) {
  const s = norm(q.trim());
  if (!s) return true;
  return [a.titulo, a.lugar, ...people(db, a)].some((x) => norm(x).includes(s));
}

export interface Filters {
  q: string;
  cat: Categoria | '';
  estado: Actividad['estado'] | '';
  drafts: boolean;
}

// ---------- Cruce de horario ----------
const mins = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
function span(a: Actividad): [number, number] | null {
  if (a.sinHora || !a.horaInicio) return null;
  const s = mins(a.horaInicio);
  const e = a.horaFin && mins(a.horaFin) > s ? mins(a.horaFin) : s + 60;
  return [s, e];
}
/** Otra actividad no cancelada del mismo día cuyo horario se cruza. */
export function findOverlap(db: DB, a: Actividad): Actividad | null {
  const x = span(a);
  if (!x || a.estado === 'Cancelada') return null;
  return (
    db.actividades.find((o) => {
      if (o.id === a.id || o.fecha !== a.fecha || o.estado === 'Cancelada') return false;
      const y = span(o);
      return !!y && x[0] < y[1] && y[0] < x[1];
    }) || null
  );
}

// ---------- Fechas del calendario ----------
/** Lunes de la semana de iso. */
export function mondayOf(iso: string) {
  const d = parseISODate(iso).getDay(); // 0 = domingo
  return addDays(iso, d === 0 ? -6 : 1 - d);
}
export function weekDays(iso: string) {
  const m = mondayOf(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(m, i));
}
/** Semanas (lun–dom) que cubren el mes de iso. */
export function monthWeeks(iso: string) {
  const first = iso.slice(0, 8) + '01';
  const weeks: string[][] = [];
  let d = mondayOf(first);
  do {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
    d = addDays(d, 7);
  } while (d.slice(0, 7) === iso.slice(0, 7));
  return weeks;
}
export function shiftMonth(iso: string, n: number) {
  const d = parseISODate(iso);
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  t.setDate(Math.min(d.getDate(), last));
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

export function tomorrowActivities(db: DB) {
  // Solo las que piden recordatorio "1 día antes" (las de "El mismo día" aparecen en Hoy).
  return activitiesOn(db, addDays(todayISO(), 1)).filter((a) => a.estado !== 'Cancelada' && a.recordatorio === '1 día antes');
}
export const actividadesTxt = (n: number) => `${n} ${n === 1 ? 'actividad' : 'actividades'}`;
