// OWNER: agente-actuaciones — P-05 Actuaciones: lista y búsqueda
import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useDB } from '../../lib/store';
import { ACT_ESTADOS, COMUNIDADES, TIPOS_ACTUACION, missingActuacion } from '../../lib/domain';
import { fmtShort } from '../../lib/dates';
import { navigate } from '../../lib/router';
import { ActionBar, ActStateBadge, DraftTag, Mark, SyncBadge } from '../../components/ui';
import { norm, solicitante, tipoLabel } from './shared';

export default function ActuacionesList(_props: { id?: string }) {
  const db = useDB();
  const [q, setQ] = useState('');
  const [comunidad, setComunidad] = useState('');
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [soloBorradores, setSoloBorradores] = useState(false);

  const comunidades = useMemo(() => {
    const s = new Set(COMUNIDADES);
    db.actuaciones.forEach((a) => a.participantes.forEach((p) => p.comunidad.trim() && s.add(p.comunidad.trim())));
    return [...s];
  }, [db.actuaciones]);

  const rows = useMemo(() => {
    const nq = norm(q);
    return db.actuaciones
      .filter((a) => {
        if (nq && !a.participantes.some((p) => norm(p.nombre).includes(nq) || (p.docNumero && p.docNumero.includes(nq)))) return false;
        if (comunidad && !a.participantes.some((p) => norm(p.comunidad) === norm(comunidad))) return false;
        if (tipo && a.tipo !== tipo) return false;
        if (estado && a.estado !== estado) return false;
        if (desde && a.fechaSolicitud < desde) return false;
        if (hasta && a.fechaSolicitud > hasta) return false;
        if (soloBorradores && !missingActuacion(a).length) return false;
        return true;
      })
      .sort((x, y) => (y.fechaSolicitud + y.createdAt).localeCompare(x.fechaSolicitud + x.createdAt));
  }, [db.actuaciones, q, comunidad, tipo, estado, desde, hasta, soloBorradores]);

  return (
    <div>
      <h1>Actuaciones</h1>

      <div className="act-search">
        <Search size={22} aria-hidden />
        <input
          type="search"
          data-testid="act-search"
          aria-label="Buscar por nombre o DNI"
          placeholder="Nombre o DNI"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Mark n={30} />
      </div>

      <div className="act-filters">
        <label className="field">
          <span className="label">Comunidad</span>
          <select value={comunidad} onChange={(e) => setComunidad(e.target.value)} data-testid="act-f-comunidad">
            <option value="">Todas</option>
            {comunidades.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Tipo de actuación</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} data-testid="act-f-tipo">
            <option value="">Todos</option>
            {TIPOS_ACTUACION.map((t) => (
              <option key={t.label} value={t.label}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">
            Estado de atención <Mark n={31} />
          </span>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} data-testid="act-f-estado">
            <option value="">Todos</option>
            {ACT_ESTADOS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Desde</span>
          <input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} data-testid="act-f-desde" />
        </label>
        <label className="field">
          <span className="label">Hasta</span>
          <input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} data-testid="act-f-hasta" />
        </label>
      </div>

      <label className="check" style={{ marginBottom: 12 }}>
        <input type="checkbox" checked={soloBorradores} onChange={(e) => setSoloBorradores(e.target.checked)} data-testid="act-only-drafts" /> Mostrar solo
        borradores <Mark n={32} />
      </label>

      <div className="list">
        {rows.map((a, i) => {
          const s = solicitante(a);
          return (
            <button key={a.id} type="button" className="item" data-testid="act-row" data-code={a.codigo} onClick={() => navigate(`/actuaciones/${a.id}`)}>
              <div className="grow">
                <div className="sub">
                  {a.codigo} · {fmtShort(a.fechaSolicitud)}
                </div>
                <div className="title">{tipoLabel(a)}</div>
                <div>{s ? s.nombre : 'Sin solicitante'}</div>
                <DraftTag missing={missingActuacion(a)} />
              </div>
              <div className="act-badges">
                <ActStateBadge e={a.estado} />
                <SyncBadge s={a.sync} />
                {i === 0 && <Mark n={33} />}
              </div>
            </button>
          );
        })}
        {!rows.length && <p className="muted">No hay actuaciones con estos filtros.</p>}
      </div>

      <ActionBar>
        <Mark n={34} />
        <button className="btn btn-primary btn-lg" data-testid="new-act" onClick={() => navigate('/actuaciones/nueva')}>
          <Plus size={24} aria-hidden /> Nueva actuación
        </button>
      </ActionBar>
    </div>
  );
}
