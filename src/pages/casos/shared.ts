// OWNER: agente-casos
import type { Actividad, Caso } from '../../lib/types';
import { nextCode, saveActividad, uid } from '../../lib/store';
import { fmtShort, nowISO, todayISO } from '../../lib/dates';
import { notify } from '../../lib/notices';

export const LABELS: Record<string, string> = {
  fechaRegistro: 'Fecha de registro',
  tipo: 'Tipo de conflicto',
  descripcion: 'Descripción',
  estado: 'Estado',
  resultado: 'Resultado o acuerdo',
  observaciones: 'Observaciones',
  partes: 'Personas',
  proximaCita: 'Próxima cita',
};

export function joinCita(fecha: string, hora: string): string | null {
  if (!fecha) return null;
  return hora ? `${fecha}T${hora}` : fecha;
}

/** "La próxima cita no puede ser en una fecha pasada." si corresponde. */
export function citaError(fecha: string): string | undefined {
  return fecha && fecha < todayISO() ? 'La próxima cita no puede ser en una fecha pasada.' : undefined;
}

function plusHour(h: string) {
  const [hh, mm] = h.split(':').map(Number);
  return `${String(Math.min(hh + 1, 23)).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Próxima fecha de atención → actividad vinculada en la agenda. Devuelve el texto "Audiencia, 19/05, 10:00". */
export function scheduleFromCase(c: Caso, cita: string): string {
  const fecha = cita.slice(0, 10);
  const hora = cita.length > 10 ? cita.slice(11, 16) : '';
  const lugar = (c.partes.find((p) => p.rol === 'Solicitante') || c.partes[0])?.comunidad || '';
  const a: Actividad = {
    id: uid(),
    codigo: nextCode('actividad'),
    titulo: 'Audiencia de conciliación',
    categoria: 'Audiencia',
    fecha,
    horaInicio: hora,
    horaFin: hora ? plusHour(hora) : '',
    sinHora: !hora,
    lugar,
    descripcion: '',
    estado: 'Programada',
    vinculo: { tipo: 'caso', id: c.id },
    creadaDesdeCaso: c.id,
    recordatorio: '1 día antes',
    personas: c.partes.map((p) => p.nombre).filter(Boolean),
    historial: [{ id: uid(), fecha: nowISO(), tipo: 'creado', texto: `Agendada desde el caso ${c.codigo}`, origen: 'tableta' }],
    sync: 'local',
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  saveActividad(a);
  return `Audiencia, ${fmtShort(fecha)}${hora ? `, ${hora}` : ''}`;
}

export function notifyScheduled(txt: string) {
  notify({ tone: 'info', title: `También se agendó: ${txt}` });
}

/** Foto pequeña (máx. 320 px) para no llenar la tableta. */
export function shrinkImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 320 / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k);
        cv.height = Math.round(img.height * k);
        cv.getContext('2d')?.drawImage(img, 0, 0, cv.width, cv.height);
        resolve(cv.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => resolve('');
      img.src = String(r.result);
    };
    r.onerror = () => resolve('');
    r.readAsDataURL(file);
  });
}
