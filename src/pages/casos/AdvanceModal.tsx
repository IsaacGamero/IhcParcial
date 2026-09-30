// OWNER: agente-casos
import { useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import type { Advance, Caso, CaseEstado, Evidence } from '../../lib/types';
import { getDB, saveCase, uid } from '../../lib/store';
import { notify } from '../../lib/notices';
import { nowISO, todayISO } from '../../lib/dates';
import { CASE_ESTADOS } from '../../lib/domain';
import { DictationHint, Field, Mark, Modal, Seg } from '../../components/ui';
import { citaError, joinCita, notifyScheduled, scheduleFromCase, shrinkImage } from './shared';

/** Registrar avance (ventana sobre el detalle, P-04). */
export function AdvanceModal({ caso, onClose }: { caso: Caso; onClose: () => void }) {
  const [fecha, setFecha] = useState(todayISO());
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<CaseEstado>(caso.estado);
  const [proxFecha, setProxFecha] = useState('');
  const [proxHora, setProxHora] = useState('');
  const [resultado, setResultado] = useState(caso.resultado);
  const [fotos, setFotos] = useState<Evidence[]>([]);
  const [ref, setRef] = useState('');
  const [shown, setShown] = useState(false);

  const needsResult = estado === 'Concluido';
  const e: Record<string, string | undefined> = {
    fecha: fecha > todayISO() ? 'La fecha no puede ser posterior a hoy.' : undefined,
    texto: texto.trim() ? undefined : 'Cuente qué se hizo hoy en el caso.',
    cita: citaError(proxFecha),
    resultado: needsResult && !resultado.trim() ? 'Para cerrar el caso, escriba el acuerdo o resultado.' : undefined,
  };
  const err = shown ? e : {};

  const addPhoto = async (f: File | undefined) => {
    if (!f) return;
    const dataUrl = await shrinkImage(f);
    setFotos((p) => [...p, { id: uid(), tipo: 'foto', texto: f.name || 'Foto', dataUrl: dataUrl || undefined }]);
  };

  const save = () => {
    if (Object.values(e).some(Boolean)) {
      setShown(true);
      return;
    }
    const cita = joinCita(proxFecha, proxHora);
    const evidencias: Evidence[] = [...fotos, ...(ref.trim() ? [{ id: uid(), tipo: 'referencia' as const, texto: ref.trim() }] : [])];
    const av: Advance = {
      id: uid(),
      fecha,
      texto: texto.trim(),
      nuevoEstado: estado !== caso.estado ? estado : undefined,
      proximaCita: cita,
      resultado: needsResult ? resultado.trim() : undefined,
      evidencias,
    };
    const latest = getDB().cases.find((x) => x.id === caso.id) || caso;
    const next: Caso = {
      ...latest,
      estado,
      resultado: needsResult ? resultado.trim() : latest.resultado,
      proximaCita: cita || latest.proximaCita,
      avances: [...latest.avances, av],
      historial: [...latest.historial, { id: uid(), fecha: nowISO(), tipo: 'avance', texto: av.texto, origen: 'tableta' }],
    };
    saveCase(next);
    const agendado = cita ? scheduleFromCase(next, cita) : '';
    notify({ tone: 'info', title: 'Avance guardado en la tableta', text: 'Se enviará cuando haya Internet.', badge: 'local' });
    if (agendado) notifyScheduled(agendado);
    onClose();
  };

  return (
    <Modal
      title="Registrar avance"
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-lg" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary btn-lg" data-testid="advance-save" onClick={save}>
            Guardar avance
          </button>
        </>
      }
    >
      <Field label="Fecha del avance" htmlFor="av-fecha" error={err.fecha}>
        <input id="av-fecha" type="date" max={todayISO()} value={fecha} onChange={(ev) => setFecha(ev.target.value)} className={err.fecha ? 'invalid' : undefined} style={{ width: 'auto' }} />
      </Field>
      <Field label="Qué se hizo" htmlFor="av-texto" error={err.texto}>
        <textarea id="av-texto" data-testid="advance-text" value={texto} onChange={(ev) => setTexto(ev.target.value)} className={err.texto ? 'invalid' : undefined} />
        <DictationHint />
      </Field>
      <Field label="Nuevo estado" optional>
        <Seg<CaseEstado> label="Nuevo estado" value={estado} options={CASE_ESTADOS} onChange={setEstado} />
      </Field>
      {needsResult && (
        <Field label="Resultado o acuerdo" htmlFor="av-res" cond="Se pide cuando el caso pasa a Concluido" error={err.resultado} mark={26}>
          <textarea id="av-res" data-testid="advance-result" value={resultado} onChange={(ev) => setResultado(ev.target.value)} className={err.resultado ? 'invalid' : undefined} />
          <DictationHint />
        </Field>
      )}
      <Field label="Próxima fecha de atención" optional error={err.cita}>
        <div className="row">
          <input type="date" aria-label="Fecha" data-testid="advance-next-date" min={todayISO()} value={proxFecha} onChange={(ev) => setProxFecha(ev.target.value)} className={err.cita ? 'invalid' : undefined} style={{ width: 'auto' }} />
          <input type="time" aria-label="Hora" value={proxHora} onChange={(ev) => setProxHora(ev.target.value)} style={{ width: 'auto' }} />
        </div>
      </Field>
      <Field label="Evidencias" optional>
        <div className="row">
          <label className="btn" data-testid="take-photo">
            <Camera size={22} aria-hidden /> Tomar foto
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              data-testid="photo-input"
              onChange={(ev) => {
                addPhoto(ev.target.files?.[0]);
                ev.target.value = '';
              }}
            />
          </label>
          {fotos.map((f) => (
            <span key={f.id} className="casos-thumb">
              {f.dataUrl ? <img src={f.dataUrl} alt={f.texto} /> : <span>{f.texto}</span>}
              <button type="button" className="btn btn-ghost btn-icon" aria-label={`Quitar ${f.texto}`} onClick={() => setFotos(fotos.filter((x) => x.id !== f.id))}>
                <Trash2 size={20} aria-hidden />
              </button>
            </span>
          ))}
        </div>
        <input aria-label="Referencia física" data-testid="advance-ref" placeholder="Acta en cuaderno 3, folio 12" value={ref} onChange={(ev) => setRef(ev.target.value)} style={{ marginTop: 8 }} />
      </Field>
    </Modal>
  );
}
