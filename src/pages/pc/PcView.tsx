// OWNER: agente-envio — P-10 Vista en computadora (datos que ya llegaron al Poder Judicial)
import { useState, type KeyboardEvent } from 'react';
import { Info, Pencil } from 'lucide-react';
import type { Actividad, Actuacion, Caso, DB, HistoryEntry, Kind } from '../../lib/types';
import { setDB, uid, useDB } from '../../lib/store';
import { ACT_ESTADOS, ACTIVIDAD_ESTADOS, CASE_ESTADOS, partyNames } from '../../lib/domain';
import { fmtDateTime, fmtShort, nowISO } from '../../lib/dates';
import { notify } from '../../lib/notices';
import { FIELD_LABEL } from '../../lib/sync';
import { ActStateBadge, ActivityStateTag, CaseStateBadge, CategoryTag, Field, Mark, Modal, Seg } from '../../components/ui';

type Rec = Caso | Actuacion | Actividad;
const LIST = { caso: 'cases', actuacion: 'actuaciones', actividad: 'actividades' } as const;
const textField = (k: Kind) => (k === 'actividad' ? 'descripcion' : 'observaciones');
const estados = (k: Kind): readonly string[] => (k === 'caso' ? CASE_ESTADOS : k === 'actuacion' ? ACT_ESTADOS : ACTIVIDAD_ESTADOS);

/** Guarda en el Poder Judicial y registra la edición (origen del conflicto en P-09). */
function savePc(kind: Kind, rec: Rec, patch: Record<string, string>) {
  const r = rec as unknown as Record<string, unknown>;
  const changed = Object.keys(patch).filter((f) => String(r[f] ?? '') !== patch[f]);
  if (!changed.length) return;
  const at = nowISO();
  setDB((d: DB) => {
    const hist: HistoryEntry = {
      id: uid(),
      fecha: at,
      tipo: 'editado',
      texto: `Cambiado desde la computadora: ${changed.map((f) => FIELD_LABEL[f] || f).join(', ')}.`,
      origen: 'computadora',
    };
    const upd = { ...rec, ...Object.fromEntries(changed.map((f) => [f, patch[f]])), updatedAt: at, historial: [hist, ...rec.historial] } as Rec;
    const arr = (d.server[LIST[kind]] as Rec[]).map((x) => (x.id === rec.id ? upd : x));
    const pcEdits = [
      ...d.server.pcEdits.filter((e) => !(e.kind === kind && e.id === rec.id && changed.includes(e.field))),
      ...changed.map((f) => ({ kind, id: rec.id, field: f, value: patch[f], at })),
    ];
    return { ...d, server: { ...d.server, [LIST[kind]]: arr, pcEdits } };
  });
  notify({ tone: 'success', title: 'Cambios guardados en el Poder Judicial.' }, 5000);
}

function EditModal({ kind, rec, onClose }: { kind: Kind; rec: Rec; onClose: () => void }) {
  const tf = textField(kind);
  const r = rec as unknown as Record<string, string>;
  const [estado, setEstado] = useState(r.estado);
  const [texto, setTexto] = useState(r[tf] || '');
  return (
    <Modal
      title={rec.codigo}
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-lg" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary btn-lg"
            data-testid="pc-edit-save"
            onClick={() => {
              savePc(kind, rec, { estado, [tf]: texto });
              onClose();
            }}
          >
            Guardar
          </button>
        </>
      }
    >
      <Field label="Estado">
        <Seg value={estado} options={estados(kind)} onChange={setEstado} label="Estado" />
      </Field>
      <Field label={FIELD_LABEL[tf]} htmlFor="pc-text" optional mark={89}>
        <textarea id="pc-text" data-testid="pc-edit-text" value={texto} onChange={(e) => setTexto(e.target.value)} />
      </Field>
    </Modal>
  );
}

function rowProps(onOpen: () => void, testid: string) {
  return {
    className: 'rowlink',
    tabIndex: 0,
    title: 'Haz clic para editar',
    'data-testid': testid,
    onClick: onOpen,
    onKeyDown: (e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen()),
  };
}

const EditCell = () => (
  <td className="pc-edit-cell">
    <Pencil size={18} aria-hidden /> Editar
  </td>
);

export default function PcView({ section }: { section?: 'casos' | 'actuaciones' | 'agenda' }) {
  const db = useDB();
  const [edit, setEdit] = useState<{ kind: Kind; rec: Rec } | null>(null);
  const s = db.server;
  const last = s.lastTabletSendAt;
  const all = !section;
  const cases = [...s.cases].sort((a, b) => b.codigo.localeCompare(a.codigo));
  const acts = [...s.actuaciones].sort((a, b) => b.codigo.localeCompare(a.codigo));
  const activs = [...s.actividades].sort((a, b) => (b.fecha + b.horaInicio).localeCompare(a.fecha + a.horaInicio));

  return (
    <div className="pc">
      <div className="banner t-blue" data-testid="pc-notice">
        <Info size={24} aria-hidden />
        <span>
          {last
            ? `La tableta envió datos por última vez el ${fmtShort(last)} a las ${last.slice(11, 16)}. Lo que registró después aún no aparece aquí.`
            : 'La tableta aún no envió datos.'}
        </span>
        <Mark n={87} />
      </div>
      <p className="muted">
        Haz clic en una fila para editarla. <Mark n={88} />
      </p>

      {(all || section === 'casos') && (
        <section className="section">
          <h1>Casos</h1>
          <table className="tbl">
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo de conflicto</th>
                <th>Partes</th>
                <th>Estado</th>
                <th>Próxima cita</th>
                <th>Observaciones</th>
                <th>Actualizado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} {...rowProps(() => setEdit({ kind: 'caso', rec: c }), 'pc-case-row')}>
                  <td className="nw">{c.codigo}</td>
                  <td>{c.tipo}</td>
                  <td>{partyNames(c.partes)}</td>
                  <td>
                    <CaseStateBadge e={c.estado} />
                  </td>
                  <td className="nw">{fmtDateTime(c.proximaCita)}</td>
                  <td>{c.observaciones}</td>
                  <td className="nw">{fmtDateTime(c.updatedAt)}</td>
                  <EditCell />
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {(all || section === 'actuaciones') && (
        <section className="section">
          <h1>Actuaciones</h1>
          <table className="tbl">
            <thead>
              <tr>
                <th>Código</th>
                <th>Trámite</th>
                <th>Solicitante</th>
                <th>Estado</th>
                <th>Atención</th>
                <th>Observaciones</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {acts.map((a) => (
                <tr key={a.id} {...rowProps(() => setEdit({ kind: 'actuacion', rec: a }), 'pc-act-row')}>
                  <td className="nw">{a.codigo}</td>
                  <td>{a.tipo}</td>
                  <td>{partyNames(a.participantes)}</td>
                  <td>
                    <ActStateBadge e={a.estado} />
                  </td>
                  <td className="nw">{fmtShort(a.fechaAtencion)}</td>
                  <td>{a.observaciones}</td>
                  <EditCell />
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {(all || section === 'agenda') && (
        <section className="section">
          <h1>Agenda</h1>
          <table className="tbl">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Actividad</th>
                <th>Categoría</th>
                <th>Lugar</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {activs.map((a) => (
                <tr key={a.id} {...rowProps(() => setEdit({ kind: 'actividad', rec: a }), 'pc-activity-row')}>
                  <td className="nw">{fmtShort(a.fecha)}</td>
                  <td className="nw">{a.sinHora ? '' : `${a.horaInicio}–${a.horaFin}`}</td>
                  <td>{a.titulo}</td>
                  <td>
                    <CategoryTag c={a.categoria} />
                  </td>
                  <td>{a.lugar}</td>
                  <td>
                    <ActivityStateTag e={a.estado} />
                  </td>
                  <EditCell />
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {edit && <EditModal kind={edit.kind} rec={edit.rec} onClose={() => setEdit(null)} />}
    </div>
  );
}
