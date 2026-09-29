import { params } from './params';

// "Hoy" congelable con ?today=2026-05-12 (y ?time=10:30). El reloj avanza desde la carga.
const loadedAt = Date.now();
let base: number | null = null;
if (params.today) {
  const [y, m, d] = params.today.split('-').map(Number);
  const [hh, mm] = (params.time || '10:30').split(':').map(Number);
  base = new Date(y, m - 1, d, hh, mm, 0).getTime();
}

export function now(): Date {
  if (base === null) return new Date();
  return new Date(base + (Date.now() - loadedAt));
}

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function todayISO(): string {
  return toISODate(now());
}
export function nowISO(): string {
  const d = now();
  return `${toISODate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function parseISODate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}
export function diffDays(a: string, b: string): number {
  // días de a hasta b (b - a)
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86400000);
}
/** 12/05 */
export function fmtShort(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = parseISODate(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}
/** 12/05/2026 */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = parseISODate(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
/** 12/05, 18:40 */
export function fmtDateTime(isoDT: string | null | undefined): string {
  if (!isoDT) return '';
  const t = isoDT.length > 10 ? isoDT.slice(11, 16) : '';
  return t ? `${fmtShort(isoDT)}, ${t}` : fmtShort(isoDT);
}
export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** "martes 12 de mayo" */
export function fmtLong(iso: string): string {
  const d = parseISODate(iso);
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}
/** AAAAMM para los códigos */
export function yyyymm(iso: string = todayISO()): string {
  return iso.slice(0, 4) + iso.slice(5, 7);
}
