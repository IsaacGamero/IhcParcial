import type { Actividad, Actuacion, Caso, DB, Party, Person } from './types';
import { diffDays, todayISO } from './dates';

// ---------- Catálogos (sección 5) ----------
export const TIPOS_CONFLICTO = [
  'Pensión de alimentos',
  'Deudas y pagos',
  'Daños a cultivos, animales o cosas',
  'Problemas entre vecinos',
  'Insultos o peleas leves',
  'Otro',
] as const;
export const TIPOS_CONFLICTO_AYUDA: Record<string, string> = {
  'Problemas entre vecinos': 'paso, agua, ruidos, límites',
  Otro: 'escribir cuál',
};

export const TIPOS_ACTUACION: { label: string; legal: string }[] = [
  { label: 'Certificar una firma', legal: 'Legalización de firma' },
  { label: 'Certificar una copia de documento', legal: 'Copia certificada' },
  { label: 'Constancia de que vive en un lugar', legal: 'Constancia domiciliaria' },
  { label: 'Constancia de que ocupa un terreno', legal: 'Constancia de posesión' },
  { label: 'Constancia de que una persona sigue con vida', legal: 'Constancia de supervivencia' },
  { label: 'Constancia de que viven juntos', legal: 'Constancia de convivencia' },
  { label: 'Documento de venta o traspaso de un bien', legal: 'Transferencia de bienes' },
  { label: 'Otra', legal: 'Escribir cuál' },
];

export const COMUNIDADES = ['Huayllay', 'Canchacucho', 'San Pedro', 'Yurajhuanca', 'Chipipata'];

export const CASE_ESTADOS = ['En trámite', 'En conciliación', 'Concluido'] as const;
export const ACT_ESTADOS = ['Pendiente', 'Atendida', 'Concluida'] as const;
export const ACT_ESTADOS_AYUDA: Record<string, string> = {
  Pendiente: 'la persona lo pidió, aún no se atiende',
  Atendida: 'ya se atendió, falta entregar',
  Concluida: 'ya se entregó',
};
export const CATEGORIAS = ['Audiencia', 'Reunión', 'Visita a comunidad', 'Otra'] as const;
export const ACTIVIDAD_ESTADOS = ['Programada', 'Realizada', 'Cancelada'] as const;

// ---------- Personas ----------
export function emptyPerson(): Person {
  return { id: Math.random().toString(36).slice(2, 10), nombre: '', docTipo: '', docNumero: '', telefono: '', sinTelefono: false, comunidad: '', direccion: '' };
}
export function emptyParty(rol: Party['rol'] = ''): Party {
  return { ...emptyPerson(), rol };
}

/** Errores de una parte/participante en lenguaje simple (tabla de P-03). */
export function validateParty(p: Party): Partial<Record<keyof Party, string>> {
  const e: Partial<Record<keyof Party, string>> = {};
  if (p.nombre.trim().split(/\s+/).filter(Boolean).length < 2) e.nombre = 'Escriba el nombre y al menos un apellido.';
  if (p.docTipo === 'DNI' && !/^\d{8}$/.test(p.docNumero)) e.docNumero = "El DNI tiene 8 números. Revíselo o elija 'No lo tiene a la mano'.";
  if ((p.docTipo === 'Carné de extranjería' || p.docTipo === 'Otro') && !p.docNumero.trim()) e.docNumero = 'Escriba el número del documento.';
  if (!p.sinTelefono && p.telefono && !/^9\d{8}$/.test(p.telefono)) e.telefono = 'El celular tiene 9 números.';
  if (!p.comunidad.trim()) e.comunidad = 'Indique la comunidad donde vive.';
  if (!p.rol) e.rol = 'Elija qué papel tiene esta persona.';
  return e;
}

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function similarName(a: string, b: string) {
  const x = norm(a).split(' ');
  const y = norm(b).split(' ');
  if (x.length < 2 || y.length < 2) return false;
  const shared = x.filter((w) => w.length > 2 && y.includes(w)).length;
  return shared >= 2;
}

export interface PersonMatch {
  person: Party;
  where: string; // "Trámite NOT-TAB01-202604-0003"
}
/** Regla 5.3: DNI si existe; si no, nombre similar + misma comunidad. Advierte, no bloquea. */
export function findDuplicatePerson(db: DB, p: Person, excludeIds: string[] = []): PersonMatch | null {
  const all: PersonMatch[] = [];
  db.cases.forEach((c) => c.partes.forEach((x) => all.push({ person: x, where: `Caso ${c.codigo}` })));
  db.actuaciones.forEach((a) => a.participantes.forEach((x) => all.push({ person: x, where: `Trámite ${a.codigo}` })));
  for (const m of all) {
    if (excludeIds.includes(m.person.id)) continue;
    if (p.docTipo === 'DNI' && /^\d{8}$/.test(p.docNumero) && m.person.docNumero === p.docNumero) return m;
    const nameMatch = similarName(p.nombre, m.person.nombre);
    if (nameMatch && (!p.comunidad || norm(p.comunidad) === norm(m.person.comunidad))) return m;
  }
  return null;
}

/** Duplicado de actuación: misma persona, mismo tipo y solicitud dentro de 7 días. */
export function findDuplicateActuacion(db: DB, a: Actuacion): Actuacion | null {
  const sol = a.participantes.find((p) => p.rol === 'Solicitante');
  if (!sol || !a.tipo) return null;
  return (
    db.actuaciones.find(
      (x) =>
        x.id !== a.id &&
        x.tipo === a.tipo &&
        Math.abs(diffDays(x.fechaSolicitud, a.fechaSolicitud)) <= 7 &&
        x.participantes.some((q) => (sol.docNumero && q.docNumero === sol.docNumero) || similarName(q.nombre, sol.nombre)),
    ) || null
  );
}

// ---------- Borrador / Completo (3.7) ----------
export function missingCaso(c: Caso): string[] {
  const m: string[] = [];
  if (!c.tipo || (c.tipo === 'Otro' && !c.tipoOtro.trim())) m.push('tipo');
  if (!c.descripcion.trim()) m.push('descripción');
  const okParties = c.partes.filter((p) => Object.keys(validateParty(p)).length === 0);
  if (!okParties.some((p) => p.rol === 'Solicitante')) m.push('personas');
  if (c.estado === 'Concluido' && !c.resultado.trim()) m.push('acuerdo');
  return m;
}
export function missingActuacion(a: Actuacion): string[] {
  const m: string[] = [];
  if (!a.tipo || (a.tipo === 'Otra' && !a.tipoOtro.trim())) m.push('tipo');
  if (!a.asunto.trim()) m.push('asunto');
  const ok = a.participantes.filter((p) => Object.keys(validateParty(p)).length === 0);
  if (!ok.some((p) => p.rol === 'Solicitante')) m.push('personas');
  if ((a.estado === 'Atendida' || a.estado === 'Concluida') && !a.fechaAtencion) m.push('fecha de atención');
  if (a.estado === 'Concluida' && !a.resultado.trim()) m.push('resultado');
  if (a.estado === 'Concluida' && !a.fechaEntrega) m.push('fecha de entrega');
  return m;
}
export function missingActividad(a: Actividad): string[] {
  const m: string[] = [];
  if (!a.titulo.trim()) m.push('título');
  if (!a.categoria) m.push('tipo');
  if (!a.fecha) m.push('fecha');
  if (!a.lugar.trim()) m.push('lugar');
  return m;
}

// ---------- Requiere atención (P-04) ----------
export function lastAdvanceDate(c: Caso): string {
  return c.avances.reduce((max, a) => (a.fecha > max ? a.fecha : max), c.fechaRegistro);
}
/** Motivo visible en texto: "Cita vencida", "Cita hoy", "15 días sin avance". */
export function attentionReason(c: Caso, days = 15): string | null {
  if (c.estado === 'Concluido') return null;
  const today = todayISO();
  if (c.proximaCita) {
    const d = c.proximaCita.slice(0, 10);
    if (d < today && lastAdvanceDate(c) < d) return 'Cita vencida';
    if (d === today) return 'Cita hoy';
  }
  const idle = diffDays(lastAdvanceDate(c), today);
  if (idle >= days) return `${idle} días sin avance`;
  return null;
}
export function attentionRank(r: string | null): number {
  if (!r) return 9;
  if (r === 'Cita vencida') return 0;
  if (r === 'Cita hoy') return 1;
  return 2;
}

export function partyNames(ps: Party[]): string {
  return ps.map((p) => p.nombre).filter(Boolean).join(' · ');
}
