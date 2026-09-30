// OWNER: agente-agenda — fila de actividad (Inicio, vista Día, resultados de búsqueda).
import type { Actividad, DB } from '../../lib/types';
import { ActivityStateTag, CategoryTag, DraftTag, SyncBadge } from '../../components/ui';
import { missingActividad } from '../../lib/domain';
import { DIAS_CORTO, fmtShort, parseISODate } from '../../lib/dates';
import { navigate } from '../../lib/router';
import { timeRange, vinculoInfo } from './agendaUtils';

export function ActivityRow({ db, a, showDate }: { db: DB; a: Actividad; showDate?: boolean }) {
  const v = vinculoInfo(db, a);
  const cancel = a.estado === 'Cancelada';
  const sub = [a.lugar, v?.label].filter(Boolean).join(' · ');
  return (
    <button type="button" className="item ag-row" data-testid="activity-item" data-id={a.id} onClick={() => navigate(`/agenda/${a.id}`)}>
      <div className={`ag-when ${cancel ? 'strike' : ''}`}>
        {showDate && (
          <div>
            {DIAS_CORTO[parseISODate(a.fecha).getDay()]} {fmtShort(a.fecha)}
          </div>
        )}
        <div>{timeRange(a)}</div>
      </div>
      <div className="grow">
        <div className={`title ${cancel ? 'strike' : ''}`}>{a.titulo || 'Sin título'}</div>
        {sub && <div className="sub">{sub}</div>}
        <div className="row ag-tags">
          <CategoryTag c={a.categoria} />
          <ActivityStateTag e={a.estado} />
          <DraftTag missing={missingActividad(a)} />
        </div>
      </div>
      <SyncBadge s={a.sync} />
    </button>
  );
}
