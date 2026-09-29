// Modelo de datos del cuaderno digital del juez de paz.

/** Distintivo por registro (3.3): local = "En la tableta", sent = "Enviado", review = "Revisar". */
export type SyncState = 'local' | 'sent' | 'review';

export type DocTipo = '' | 'DNI' | 'Carné de extranjería' | 'Otro' | 'No tiene' | 'No lo tiene a la mano';

export interface Person {
  id: string;
  nombre: string;
  docTipo: DocTipo;
  docNumero: string;
  telefono: string;
  sinTelefono: boolean;
  comunidad: string;
  direccion: string;
}

/** Parte de un caso (rol) o participante de una actuación (participación). */
export interface Party extends Person {
  rol: '' | 'Solicitante' | 'Invitado' | 'Testigo' | 'Declarante';
}

export interface Evidence {
  id: string;
  tipo: 'foto' | 'referencia';
  texto: string; // referencia física o nombre de la foto
  dataUrl?: string;
}

/** Entrada del historial: avances, cambios y versiones descartadas en conflictos. */
export interface HistoryEntry {
  id: string;
  fecha: string; // ISO fecha-hora
  tipo: 'creado' | 'editado' | 'avance' | 'conflicto' | 'enviado';
  texto: string;
  /** Versión descartada de campos (conflictos), recuperable. */
  descartado?: Record<string, unknown>;
  origen?: 'tableta' | 'computadora';
}

export interface Advance {
  id: string;
  fecha: string; // AAAA-MM-DD
  texto: string;
  nuevoEstado?: CaseEstado;
  proximaCita?: string | null; // AAAA-MM-DDTHH:mm
  resultado?: string;
  evidencias: Evidence[];
}

export type CaseEstado = 'En trámite' | 'En conciliación' | 'Concluido';

export interface Caso {
  id: string;
  codigo: string;
  fechaRegistro: string;
  tipo: string; // catálogo 5.1
  tipoOtro: string;
  descripcion: string;
  estado: CaseEstado;
  resultado: string;
  observaciones: string;
  partes: Party[];
  avances: Advance[];
  proximaCita: string | null; // AAAA-MM-DDTHH:mm
  evidencias: Evidence[];
  historial: HistoryEntry[];
  sync: SyncState;
  createdAt: string;
  updatedAt: string;
}

export type ActEstado = 'Pendiente' | 'Atendida' | 'Concluida';

export interface Actuacion {
  id: string;
  codigo: string;
  fechaSolicitud: string;
  tipo: string; // catálogo 5.2
  tipoOtro: string;
  asunto: string;
  estado: ActEstado;
  fechaAtencion: string;
  resultado: string;
  fechaEntrega: string;
  observaciones: string;
  participantes: Party[];
  documentos: Evidence[];
  historial: HistoryEntry[];
  sync: SyncState;
  createdAt: string;
  updatedAt: string;
}

export type Categoria = 'Audiencia' | 'Reunión' | 'Visita a comunidad' | 'Otra';
export type ActividadEstado = 'Programada' | 'Realizada' | 'Cancelada';

export interface Actividad {
  id: string;
  codigo: string;
  titulo: string;
  categoria: Categoria | '';
  fecha: string; // AAAA-MM-DD
  horaInicio: string; // HH:mm
  horaFin: string;
  sinHora: boolean;
  lugar: string;
  descripcion: string;
  estado: ActividadEstado;
  vinculo: { tipo: 'caso' | 'actuacion'; id: string } | null;
  creadaDesdeCaso: string | null; // id del caso
  recordatorio: 'No' | 'El mismo día' | '1 día antes';
  personas: string[]; // nombres vinculados (para buscar)
  historial: HistoryEntry[];
  sync: SyncState;
  createdAt: string;
  updatedAt: string;
}

export type Kind = 'caso' | 'actuacion' | 'actividad';

/** Formulario sin terminar (guardado automático, 3.5). */
export interface FormDraft {
  kind: Kind;
  editingId: string | null; // null si es nuevo
  step: number;
  data: unknown;
  label: string; // "Juan Quispe, 12/05"
  updatedAt: string;
}

export interface SyncItemResult {
  kind: Kind;
  id: string;
  codigo: string;
  label: string;
  status: 'waiting' | 'sending' | 'sent' | 'failed' | 'conflict';
}

export interface SyncRun {
  status: 'idle' | 'running' | 'ok' | 'partial' | 'error' | 'conflict';
  total: number;
  done: number;
  items: SyncItemResult[];
  startedAt: string;
  finishedAt: string | null;
  /** Conflicto resuelto automáticamente (P-09). */
  conflicts: ConflictInfo[];
}

export interface ConflictInfo {
  kind: Kind;
  id: string;
  codigo: string;
  fields: { field: string; label: string; tablet: string; pc: string; used: 'tablet' | 'pc'; pcDate: string }[];
}

export interface Meta {
  pin: string;
  onboarded: boolean;
  fontSize: 'normal' | 'large' | 'xlarge';
  lastSentAt: string | null; // AAAA-MM-DDTHH:mm
  counters: { caso: number; actuacion: number; actividad: number };
  juzgado: string; // "04"
  tableta: string; // "01"
  attentionDays: number; // umbral de "sin avance" (15)
}

export interface DB {
  version: number;
  cases: Caso[];
  actuaciones: Actuacion[];
  actividades: Actividad[];
  drafts: Partial<Record<Kind, FormDraft>>;
  meta: Meta;
  syncRun: SyncRun | null;
  /** Datos que "ya llegaron" al Poder Judicial (P-10), JSON simulado. */
  server: {
    cases: Caso[];
    actuaciones: Actuacion[];
    actividades: Actividad[];
    lastTabletSendAt: string | null;
    /** Ediciones hechas desde la computadora que aún no bajan a la tableta (origen del conflicto). */
    pcEdits: { kind: Kind; id: string; field: string; value: string; at: string }[];
  };
}
