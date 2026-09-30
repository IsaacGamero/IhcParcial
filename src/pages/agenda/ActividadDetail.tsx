// OWNER: agente-agenda — Detalle de actividad
import { AlertTriangle, CheckCircle, Clock, Pencil, XCircle } from 'lucide-react';
import type { ActividadEstado } from '../../lib/types';
import { saveActividad, uid, useDB } from '../../lib/store';
import { ACTIVIDAD_ESTADOS, missingActividad } from '../../lib/domain';
import { fmtLong, nowISO, todayISO } from '../../lib/dates';
import { navigate } from '../../lib/router';
import { notify } from '../../lib/notices';
import { ActionBar, ActivityStateTag, CategoryTag, DraftTag, Mark, Seg, SyncBadge } from '../../components/ui';
import { agendaHref } from './Agenda';
import { timeRange, vinculoInfo } from './agendaUtils';

export default function ActividadDetail({ id }: { id?: string }) {
  const db = useDB();
  const a = db.actividades.find((x) => x.id === id);
  if (!a) return <p>No se encontró la actividad.</p>;
  const v = vinculoInfo(db, a);
  const desdeCaso = a.creadaDesdeCaso ? db.cases.find((c) => c.id === a.creadaDesdeCaso) : undefined;
  const cancel = a.estado === 'Cancelada';

  const setEstado = (e: ActividadEstado) => {
    if (e === a.estado) return;
    saveActividad({ ...a, estado: e, historial: [...a.historial, { id: uid(), fecha: nowISO(), tipo: 'editado', texto: `Estado: ${e}`, origen: 'tableta' }] });
    notify({ tone: 'info', title: 'Actividad guardada en la tableta', text: 'Se enviará cuando haya Internet.', badge: 'local' });
  };

  return (
    <div className="ag-detail">
      <div className="row">
        <h1 className={cancel ? 'strike' : ''} style={{ margin: 0 }}>
          {a.titulo || 'Sin título'}
        </h1>
        <span className="spacer" />
        <SyncBadge s={a.sync} />
      </div>
      <div className="row ag-tags" style={{ margin: '10px 0 16px' }}>
        <CategoryTag c={a.categoria} />
        <ActivityStateTag e={a.estado} />
        <DraftTag missing={missingActividad(a)} />
      </div>

      <dl className="ag-dl card">
        <dt>Fecha</dt>
        <dd>
          <a href={`#${agendaHref('dia', a.fecha)}`}>{a.fecha ? fmtLong(a.fecha) : '—'}</a> · {timeRange(a)}
        </dd>
        <dt>Lugar</dt>
        <dd>{a.lugar || '—'}</dd>
        {a.descripcion && (
          <>
            <dt>Descripción</dt>
            <dd>{a.descripcion}</dd>
          </>
        )}
        {v && (
          <>
            <dt>Vínculo</dt>
            <dd data-testid="activity-link">
              {desdeCaso ? (
                <>
                  Creada desde el caso <a href={`#/casos/${desdeCaso.id}`}>{desdeCaso.codigo}</a>
                </>
              ) : (
                <a href={v.href}>{v.label}</a>
              )}
              {a.personas.length > 0 && <div className="muted small">{a.personas.join(' · ')}</div>}
              <Mark n={61} />
            </dd>
          </>
        )}
        <dt>Recordatorio</dt>
        <dd>{a.recordatorio}</dd>
        <dt>Código</dt>
        <dd>{a.codigo}</dd>
      </dl>

      <div className="field" style={{ marginTop: 16 }}>
        <span className="label">
          Estado <Mark n={62} />
        </span>
        <Seg
          label="Cambiar estado"
          value={a.estado}
          options={ACTIVIDAD_ESTADOS}
          onChange={setEstado}
          icons={{ Programada: <Clock size={20} aria-hidden />, Realizada: <CheckCircle size={20} aria-hidden />, Cancelada: <XCircle size={20} aria-hidden /> }}
        />
        {a.estado === 'Realizada' && a.fecha > todayISO() && (
          <div className="ag-warn" role="status">
            <AlertTriangle size={18} aria-hidden /> Marcó como realizada una actividad que aún no ocurre. ¿Es correcto?
          </div>
        )}
      </div>

      <ActionBar
        left={
          <button className="btn" onClick={() => navigate(agendaHref('dia', a.fecha))}>
            Volver a la agenda
          </button>
        }
      >
        <button className="btn btn-primary btn-lg" data-testid="edit-activity" onClick={() => navigate(`/agenda/${a.id}/editar`)}>
          <Pencil size={22} aria-hidden /> Editar
        </button>
      </ActionBar>
    </div>
  );
}
