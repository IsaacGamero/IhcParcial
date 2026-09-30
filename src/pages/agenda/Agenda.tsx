// OWNER: agente-agenda — P-07 Agenda (Mes, Semana, Día)
import { useState } from 'react';
import { Bell, CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { Actividad, ActividadEstado, Categoria } from '../../lib/types';
import { useDB } from '../../lib/store';
import { ACTIVIDAD_ESTADOS, CATEGORIAS, missingActividad } from '../../lib/domain';
import { addDays, DIAS_CORTO, fmtLong, MESES, parseISODate, todayISO } from '../../lib/dates';
import { navigate, useRoute } from '../../lib/router';
import { ActionBar, ActivityStateTag, CAT_CLASS, CAT_ICON, CategoryTag, DraftTag, Mark, SyncBadge } from '../../components/ui';
import { ActivityRow } from './ActivityRow';
import {
  actividadesTxt, byDateTime, Filters, hm, matches, monthWeeks, shiftMonth, timeRange, tomorrowActivities, Vista, weekDays,
} from './agendaUtils';

const VISTAS: Record<string, Vista> = { Mes: 'mes', Semana: 'semana', Día: 'dia' };
const VISTA_LBL: Record<Vista, 'Mes' | 'Semana' | 'Día'> = { mes: 'Mes', semana: 'Semana', dia: 'Día' };

export function agendaHref(vista: Vista, fecha: string) {
  return `/agenda?vista=${vista}&fecha=${fecha}`;
}

function periodLabel(vista: Vista, f: string) {
  const d = parseISODate(f);
  if (vista === 'mes') return `${MESES[d.getMonth()]} ${d.getFullYear()}`;
  if (vista === 'dia') return fmtLong(f);
  const w = weekDays(f);
  const a = parseISODate(w[0]);
  const b = parseISODate(w[6]);
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} – ${b.getDate()} de ${MESES[b.getMonth()]}`
    : `${a.getDate()} de ${MESES[a.getMonth()]} – ${b.getDate()} de ${MESES[b.getMonth()]}`;
}

export default function Agenda() {
  const db = useDB();
  const { query } = useRoute();
  const today = todayISO();
  const vista: Vista = (['mes', 'semana', 'dia'] as const).find((v) => v === query.get('vista')) || 'semana';
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(query.get('fecha') || '') ? query.get('fecha')! : today;
  const go = (v: Vista, f: string) => navigate(agendaHref(v, f));

  const [f, setF] = useState<Filters>({ q: '', cat: '', estado: '', drafts: false });
  const shown = db.actividades
    .filter((a) => (!f.cat || a.categoria === f.cat) && (!f.estado || a.estado === f.estado))
    .filter((a) => (!f.drafts || missingActividad(a).length > 0) && matches(db, a, f.q))
    .sort(byDateTime);
  const on = (iso: string) => shown.filter((a) => a.fecha === iso);
  const listMode = !!f.q.trim() || f.drafts;

  const step = (n: number) => go(vista, vista === 'mes' ? shiftMonth(fecha, n) : addDays(fecha, n * (vista === 'semana' ? 7 : 1)));
  const manana = tomorrowActivities(db);

  return (
    <div className="agenda">
      <h1 className="sr-only">Agenda</h1>
      {manana.length > 0 && (
        <button type="button" className="banner t-amber ag-strip" data-testid="agenda-tomorrow" onClick={() => go('dia', addDays(today, 1))}>
          <Bell size={22} aria-hidden /> Mañana: {actividadesTxt(manana.length)}
          <Mark n={56} />
        </button>
      )}

      <div className="row ag-toolbar">
        <div className="seg ag-views" role="group" aria-label="Vista">
          {(['Mes', 'Semana', 'Día'] as const).map((l) => (
            <button key={l} type="button" aria-pressed={VISTA_LBL[vista] === l} data-testid={`view-${VISTAS[l]}`} onClick={() => go(VISTAS[l], fecha)}>
              {l}
            </button>
          ))}
        </div>
        <Mark n={57} />
        <button className="btn" data-testid="go-today" onClick={() => go(vista, today)}>
          <CalendarDays size={22} aria-hidden /> Hoy
        </button>
        <button className="btn btn-icon" aria-label="Anterior" data-testid="go-prev" onClick={() => step(-1)}>
          <ChevronLeft size={28} aria-hidden />
        </button>
        <button className="btn btn-icon" aria-label="Siguiente" data-testid="go-next" onClick={() => step(1)}>
          <ChevronRight size={28} aria-hidden />
        </button>
        <h2 className="ag-period" data-testid="agenda-period">
          {periodLabel(vista, fecha)}
        </h2>
      </div>

      <div className="row ag-filters">
        <label className="ag-search">
          <Search size={22} aria-hidden />
          <input
            type="search"
            placeholder="Título, comunidad o persona"
            aria-label="Buscar actividad"
            data-testid="agenda-search"
            value={f.q}
            onChange={(e) => setF({ ...f, q: e.target.value })}
          />
        </label>
        <select aria-label="Tipo" data-testid="agenda-filter-cat" value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value as Categoria | '' })}>
          <option value="">Todos los tipos</option>
          {CATEGORIAS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select aria-label="Estado" data-testid="agenda-filter-estado" value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value as ActividadEstado | '' })}>
          <option value="">Todos los estados</option>
          {ACTIVIDAD_ESTADOS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <label className="check">
          <input type="checkbox" data-testid="agenda-only-drafts" checked={f.drafts} onChange={(e) => setF({ ...f, drafts: e.target.checked })} />
          Mostrar solo borradores
        </label>
        <Mark n={58} />
      </div>

      {listMode ? (
        <div className="list" data-testid="agenda-results">
          {shown.length ? shown.map((a) => <ActivityRow key={a.id} db={db} a={a} showDate />) : <p className="muted">Sin resultados</p>}
        </div>
      ) : vista === 'mes' ? (
        <MonthView fecha={fecha} today={today} on={on} open={(d) => go('dia', d)} />
      ) : vista === 'semana' ? (
        <WeekView fecha={fecha} today={today} on={on} open={(d) => go('dia', d)} />
      ) : (
        <div className="list" data-testid="agenda-day">
          {on(fecha).length ? on(fecha).map((a) => <ActivityRow key={a.id} db={db} a={a} />) : <p className="muted">Sin actividades</p>}
        </div>
      )}

      <ActionBar>
        <button className="btn btn-primary btn-lg" data-testid="new-activity" onClick={() => navigate(`/agenda/nueva?fecha=${vista === 'dia' && fecha >= today ? fecha : today}`)}>
          <CalendarPlus size={24} aria-hidden /> Nueva actividad
        </button>
      </ActionBar>
    </div>
  );
}

function Chip({ a }: { a: Actividad }) {
  const Icon = a.categoria ? CAT_ICON[a.categoria] : CalendarDays;
  const k = a.categoria ? CAT_CLASS[a.categoria] : 'otra';
  return (
    <span className={`ag-chip ${a.estado === 'Cancelada' ? 'strike' : ''}`} style={{ background: `var(--cat-${k}-soft)`, color: `var(--cat-${k})` }}>
      <Icon size={14} aria-hidden />
      {!a.sinHora && a.horaInicio && <b>{hm(a.horaInicio)}</b>} {a.titulo || 'Sin título'}
    </span>
  );
}

function MonthView({ fecha, today, on, open }: { fecha: string; today: string; on: (d: string) => Actividad[]; open: (d: string) => void }) {
  const month = fecha.slice(0, 7);
  return (
    <div className="ag-month" data-testid="agenda-month">
      {[1, 2, 3, 4, 5, 6, 0].map((i) => (
        <div key={i} className="ag-dow">
          {DIAS_CORTO[i]}
        </div>
      ))}
      {monthWeeks(fecha)
        .flat()
        .map((d) => {
          const list = on(d);
          return (
            <button
              key={d}
              type="button"
              className={`ag-cell ${d.slice(0, 7) !== month ? 'out' : ''} ${d === today ? 'today' : ''}`}
              data-testid={`day-cell-${d}`}
              aria-label={`${fmtLong(d)}: ${actividadesTxt(list.length)}`}
              onClick={() => open(d)}
            >
              <span className="ag-num">{Number(d.slice(8))}</span>
              {list.slice(0, 3).map((a) => (
                <Chip key={a.id} a={a} />
              ))}
              {list.length > 3 && <span className="ag-more">+{list.length - 3} más</span>}
            </button>
          );
        })}
      <Mark n={59} />
    </div>
  );
}

function WeekView({ fecha, today, on, open }: { fecha: string; today: string; on: (d: string) => Actividad[]; open: (d: string) => void }) {
  return (
    <div className="ag-week" data-testid="agenda-week">
      {weekDays(fecha).map((d) => {
        const dt = parseISODate(d);
        return (
          <div key={d} className={`ag-col ${d === today ? 'today' : ''}`}>
            <button type="button" className="ag-head" data-testid={`day-cell-${d}`} aria-label={fmtLong(d)} onClick={() => open(d)}>
              <span>{DIAS_CORTO[dt.getDay()]}</span>
              <strong>{dt.getDate()}</strong>
            </button>
            {on(d).map((a) => (
              <button key={a.id} type="button" className="ag-card" data-testid="activity-item" data-id={a.id} onClick={() => navigate(`/agenda/${a.id}`)}>
                <span className={a.estado === 'Cancelada' ? 'strike' : ''}>{timeRange(a)}</span>
                <strong className={a.estado === 'Cancelada' ? 'strike' : ''}>{a.titulo || 'Sin título'}</strong>
                <CategoryTag c={a.categoria} />
                <ActivityStateTag e={a.estado} />
                <DraftTag missing={missingActividad(a)} />
                <SyncBadge s={a.sync} />
              </button>
            ))}
          </div>
        );
      })}
      <Mark n={60} />
    </div>
  );
}
