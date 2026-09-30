// OWNER: agente-actuaciones — utilidades comunes de P-05 / P-06.
import { Check, FilePen } from 'lucide-react';
import type { Actuacion, Party } from '../../lib/types';
import { TIPOS_ACTUACION } from '../../lib/domain';

/** Tipo en lenguaje cotidiano ("Otra" → lo que escribió la jueza). */
export function tipoLabel(a: Pick<Actuacion, 'tipo' | 'tipoOtro'>): string {
  if (!a.tipo) return 'Sin tipo';
  if (a.tipo === 'Otra') return a.tipoOtro.trim() || 'Otra';
  return a.tipo;
}
export function tipoLegal(tipo: string): string {
  if (!tipo || tipo === 'Otra') return '';
  return TIPOS_ACTUACION.find((t) => t.label === tipo)?.legal || '';
}

export function solicitante(a: Actuacion): Party | undefined {
  return a.participantes.find((p) => p.rol === 'Solicitante' && p.nombre.trim()) || a.participantes.find((p) => p.nombre.trim());
}

export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/** Estado del registro (3.7), separado del estado de atención. */
export function RecordState({ missing }: { missing: string[] }) {
  if (missing.length)
    return (
      <span className="badge t-amber" data-record="draft">
        <FilePen size={16} aria-hidden /> Borrador · falta: {missing.join(', ')}
      </span>
    );
  return (
    <span className="badge t-blue" data-record="complete">
      <Check size={16} aria-hidden /> Completo
    </span>
  );
}
