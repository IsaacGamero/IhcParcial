// OWNER: agente-casos
import { useState } from 'react';
import { CalendarDays, ChevronRight, NotebookPen, Pencil } from 'lucide-react';
import type { Evidence } from '../../lib/types';
import { useDB } from '../../lib/store';
import { navigate } from '../../lib/router';
import { fmtDate, fmtDateTime } from '../../lib/dates';
import { attentionReason, missingCaso } from '../../lib/domain';
import { ActionBar, ActivityStateTag, AttentionBadge, CaseStateBadge, CategoryTag, DraftTag, Mark, SyncBadge } from '../../components/ui';
import { AdvanceModal } from './AdvanceModal';

export default function CasoDetail({ id }: { id?: string }) {
  const db = useDB();
  const c = db.cases.find((x) => x.id === id);
  const [adv, setAdv] = useState(false);
  if (!c) return <p>No se encontró el caso.</p>;

  const reason = attentionReason(c, db.meta.attentionDays);
  const avances = [...c.avances].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const evidencias: (Evidence & { fecha?: string })[] = [
    ...c.evidencias,
    ...avances.flatMap((a) => a.evidencias.map((e) => ({ ...e, fecha: a.fecha }))),
  ];
  const actividades = db.actividades.filter((a) => a.vinculo?.tipo === 'caso' && a.vinculo.id === c.id).sort((a, b) => (a.fecha + a.horaInicio).localeCompare(b.fecha + b.horaInicio));

  return (
    <div className="caso-detail">
      <div className="row">
        <h1 style={{ margin: 0 }} data-testid="case-code">
          {c.codigo}
        </h1>
        <CaseStateBadge e={c.estado} />
        <SyncBadge s={c.sync} />
        <AttentionBadge r={reason} />
        <Mark n={24} />
        <DraftTag missing={missingCaso(c)} />
      </div>
      <p className="casos-lead">
        <strong>{c.tipo === 'Otro' ? c.tipoOtro || 'Otro' : c.tipo}</strong> · {fmtDate(c.fechaRegistro)}
        <br />
        {c.descripcion}
      </p>

      <div className="grid2">
        <section className="card" aria-label="Personas">
          <h2>Personas</h2>
          {c.partes.length ? (
            <ul className="casos-ul">
              {c.partes.map((p) => (
                <li key={p.id}>
                  <strong>{p.nombre}</strong> · {p.rol || 'sin rol'}
                  <div className="muted small">
                    {[p.comunidad, p.docTipo === 'DNI' && p.docNumero ? `DNI ${p.docNumero}` : '', p.telefono].filter(Boolean).join(' · ')}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">—</p>
          )}
        </section>
        <section className="card" aria-label="Próxima cita">
          <h2>Próxima cita</h2>
          <p data-testid="case-next">{c.proximaCita ? fmtDateTime(c.proximaCita) : '—'}</p>
          {c.resultado && (
            <>
              <h2>Resultado o acuerdo</h2>
              <p data-testid="case-result">{c.resultado}</p>
            </>
          )}
          {c.observaciones && (
            <>
              <h2>Observaciones</h2>
              <p>{c.observaciones}</p>
            </>
          )}
        </section>
      </div>

      <section className="section" aria-label="Avances" style={{ marginTop: 20 }}>
        <div className="row">
          <h2 style={{ margin: 0 }}>Avances</h2>
          <Mark n={27} />
        </div>
        {avances.length ? (
          <ol className="casos-timeline" data-testid="case-advances">
            {avances.map((a) => (
              <li key={a.id}>
                <div className="row">
                  <strong>{fmtDate(a.fecha)}</strong>
                  {a.nuevoEstado && <CaseStateBadge e={a.nuevoEstado} />}
                </div>
                <div>{a.texto}</div>
                {a.resultado && <div className="muted">Acuerdo: {a.resultado}</div>}
                {a.proximaCita && <div className="muted">Próxima cita: {fmtDateTime(a.proximaCita)}</div>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">—</p>
        )}
      </section>

      {evidencias.length > 0 && (
        <section className="section" aria-label="Evidencias">
          <div className="row">
            <h2 style={{ margin: 0 }}>Evidencias</h2>
            <Mark n={28} />
          </div>
          <div className="row casos-evid">
            {evidencias.map((e) => (
              <div key={e.id} className="card casos-evid-item">
                {e.dataUrl && <img src={e.dataUrl} alt={e.texto} />}
                <div>{e.texto}</div>
                {e.fecha && <div className="muted small">{fmtDate(e.fecha)}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {actividades.length > 0 && (
        <section className="section" aria-label="Agenda">
          <div className="row">
            <h2 style={{ margin: 0 }}>Agenda</h2>
            <Mark n={29} />
          </div>
          <div className="list">
            {actividades.map((a) => (
              <a key={a.id} href={`#/agenda/${a.id}`} className="item" data-testid="case-activity">
                <CalendarDays size={24} aria-hidden />
                <div className="grow">
                  <div className="title">{a.titulo}</div>
                  <div className="sub">{fmtDateTime(a.fecha + (a.horaInicio ? `T${a.horaInicio}` : ''))}</div>
                </div>
                <CategoryTag c={a.categoria} />
                <ActivityStateTag e={a.estado} />
                <SyncBadge s={a.sync} />
                <ChevronRight size={24} aria-hidden />
              </a>
            ))}
          </div>
        </section>
      )}

      <ActionBar
        left={
          <button className="btn btn-lg" data-testid="edit-case" onClick={() => navigate(`/casos/${c.id}/editar`)}>
            <Pencil size={22} aria-hidden /> Editar datos
          </button>
        }
      >
        <Mark n={25} />
        <button className="btn btn-primary btn-lg" data-testid="register-advance" onClick={() => setAdv(true)}>
          <NotebookPen size={24} aria-hidden /> Registrar avance
        </button>
      </ActionBar>

      {adv && <AdvanceModal caso={c} onClose={() => setAdv(false)} />}
    </div>
  );
}
