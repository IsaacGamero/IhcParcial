// OWNER: agente-casos
import { useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, MapPin, Plus, Search, X } from 'lucide-react';
import { useDB } from '../../lib/store';
import { navigate } from '../../lib/router';
import { CASE_ESTADOS, COMUNIDADES, attentionRank, attentionReason, missingCaso, partyNames } from '../../lib/domain';
import type { CaseEstado } from '../../lib/types';
import { ActionBar, AttentionBadge, CaseStateBadge, DraftTag, Mark, SyncBadge } from '../../components/ui';

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

export default function CasosList(_props: { id?: string }) {
  const db = useDB();
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState<CaseEstado | ''>('');
  const [comunidad, setComunidad] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [soloBorradores, setSoloBorradores] = useState(false);
  const [open, setOpen] = useState<'' | 'comunidad' | 'fechas'>('');

  const rows = useMemo(() => {
    const t = norm(q);
    return db.cases
      .map((c) => ({ c, reason: attentionReason(c, db.meta.attentionDays), missing: missingCaso(c) }))
      .filter(({ c, missing }) => {
        if (t && !c.partes.some((p) => norm(p.nombre).includes(t) || (p.docNumero && p.docNumero.includes(t))) && !norm(c.codigo).includes(t)) return false;
        if (estado && c.estado !== estado) return false;
        if (comunidad && !c.partes.some((p) => norm(p.comunidad) === norm(comunidad))) return false;
        if (desde && c.fechaRegistro < desde) return false;
        if (hasta && c.fechaRegistro > hasta) return false;
        if (soloBorradores && !missing.length) return false;
        return true;
      })
      .sort((a, b) => attentionRank(a.reason) - attentionRank(b.reason) || b.c.fechaRegistro.localeCompare(a.c.fechaRegistro));
  }, [db, q, estado, comunidad, desde, hasta, soloBorradores]);

  const anyFilter = q || estado || comunidad || desde || hasta || soloBorradores;
  const clear = () => {
    setQ('');
    setEstado('');
    setComunidad('');
    setDesde('');
    setHasta('');
    setSoloBorradores(false);
    setOpen('');
  };

  return (
    <div>
      <h1>Casos</h1>
      <div className="field casos-search">
        <label htmlFor="case-search" className="sr-only">
          Buscar por nombre o DNI
        </label>
        <Search size={22} aria-hidden className="casos-search-icon" />
        <input
          id="case-search"
          data-testid="case-search"
          type="search"
          placeholder="Nombre o DNI"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
        />
        <Mark n={10} />
      </div>

      <div className="row casos-filters" role="group" aria-label="Filtros">
        <div className="seg" role="group" aria-label="Estado">
          {CASE_ESTADOS.map((e) => (
            <button key={e} type="button" data-testid={`filter-estado-${e}`} aria-pressed={estado === e} onClick={() => setEstado(estado === e ? '' : e)}>
              {e}
            </button>
          ))}
        </div>
        <Mark n={11} />
        <button type="button" className="btn" data-testid="filter-comunidad" aria-expanded={open === 'comunidad'} onClick={() => setOpen(open === 'comunidad' ? '' : 'comunidad')}>
          <MapPin size={20} aria-hidden /> {comunidad || 'Comunidad'}
        </button>
        <button type="button" className="btn" data-testid="filter-fechas" aria-expanded={open === 'fechas'} onClick={() => setOpen(open === 'fechas' ? '' : 'fechas')}>
          <CalendarDays size={20} aria-hidden /> {desde || hasta ? `${desde ? desde.split('-').reverse().join('/') : '…'} – ${hasta ? hasta.split('-').reverse().join('/') : '…'}` : 'Fechas'}
        </button>
        <label className="check">
          <input type="checkbox" data-testid="only-drafts" checked={soloBorradores} onChange={(e) => setSoloBorradores(e.target.checked)} /> Mostrar solo borradores
        </label>
        <Mark n={13} />
        {anyFilter && (
          <button type="button" className="btn btn-ghost" onClick={clear} data-testid="clear-filters">
            <X size={20} aria-hidden /> Quitar filtros
          </button>
        )}
      </div>

      {open === 'comunidad' && (
        <div className="seg casos-panel" role="group" aria-label="Comunidad">
          {COMUNIDADES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={comunidad === c}
              onClick={() => {
                setComunidad(comunidad === c ? '' : c);
                setOpen('');
              }}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      {open === 'fechas' && (
        <div className="row casos-panel">
          <label className="row">
            Desde
            <input type="date" data-testid="filter-desde" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ width: 'auto' }} />
          </label>
          <label className="row">
            Hasta
            <input type="date" data-testid="filter-hasta" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ width: 'auto' }} />
          </label>
        </div>
      )}

      <div className="list" aria-label="Lista de casos">
        {rows.map(({ c, reason, missing }, i) => (
          <button key={c.id} type="button" className="item" data-testid="case-row" data-code={c.codigo} onClick={() => navigate(`/casos/${c.id}`)}>
            <div className="grow">
              <div className="title">{partyNames(c.partes) || 'Sin personas'}</div>
              <div className="sub">
                {c.codigo} · {c.tipo === 'Otro' ? c.tipoOtro || 'Otro' : c.tipo || 'Sin tipo'}
              </div>
              <DraftTag missing={missing} />
            </div>
            <div className="casos-badges">
              <CaseStateBadge e={c.estado} />
              <AttentionBadge r={reason} />
              {i === 0 && reason && <Mark n={12} />}
              <SyncBadge s={c.sync} />
              {i === 0 && <Mark n={14} />}
            </div>
            <ChevronRight size={24} aria-hidden />
          </button>
        ))}
        {!rows.length && <p className="muted">Sin resultados</p>}
      </div>

      <ActionBar>
        <button className="btn btn-primary btn-lg" data-testid="new-case" onClick={() => navigate('/casos/nuevo')}>
          <Plus size={24} aria-hidden /> Nuevo caso
        </button>
      </ActionBar>
    </div>
  );
}
