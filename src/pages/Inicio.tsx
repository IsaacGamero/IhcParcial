// OWNER: agente-agenda — P-01 Inicio
import { useState } from 'react';
import { AlertTriangle, Bell, CalendarPlus, FilePlus, FolderPlus, RotateCcw } from 'lucide-react';
import type { Kind } from '../lib/types';
import { pendingRecords, setDraft, useDB } from '../lib/store';
import { attentionRank, attentionReason, partyNames } from '../lib/domain';
import { addDays, diffDays, fmtLong, todayISO } from '../lib/dates';
import { navigate } from '../lib/router';
import { AttentionBadge, Mark, Modal } from '../components/ui';
import { ActivityRow } from './agenda/ActivityRow';
import { actividadesTxt, activitiesOn, byDateTime, hm, tomorrowActivities, vinculoInfo } from './agenda/agendaUtils';

const KIND_TXT: Record<Kind, string> = { caso: 'un caso', actuacion: 'una actuación', actividad: 'una actividad' };
function draftRoute(kind: Kind, editingId: string | null) {
  const base = kind === 'caso' ? '/casos' : kind === 'actuacion' ? '/actuaciones' : '/agenda';
  const nuevo = kind === 'caso' ? 'nuevo' : 'nueva';
  return `${base}/${editingId ? `${editingId}/editar` : nuevo}?continuar=1`;
}

export default function Inicio() {
  const db = useDB();
  const today = todayISO();
  const [discard, setDiscard] = useState<Kind | null>(null);

  // 1. Recordatorio de envío (3.5) y borradores sin terminar
  const pending = pendingRecords(db).length;
  const last = db.meta.lastSentAt;
  const idle = last ? diffDays(last.slice(0, 10), today) : 0;
  const drafts = (Object.values(db.drafts) as NonNullable<(typeof db.drafts)[Kind]>[]).filter(Boolean);

  // 2-4
  const hoy = activitiesOn(db, today);
  const attention = db.cases
    .map((c) => ({ c, r: attentionReason(c, db.meta.attentionDays) }))
    .filter((x) => x.r)
    .sort((a, b) => attentionRank(a.r) - attentionRank(b.r));
  const manana = tomorrowActivities(db);
  const next = db.actividades.filter((a) => a.fecha >= addDays(today, 2) && a.fecha <= addDays(today, 7)).sort(byDateTime);

  return (
    <div className="home">
      <h1 className="sr-only">Inicio</h1>

      {pending > 0 && idle >= 3 && (
        <div className="banner t-amber" role="alert" data-testid="home-send-reminder">
          <AlertTriangle size={24} aria-hidden />
          <span>
            Lleva {idle} días sin enviar sus registros. Si la tableta se pierde o daña, lo no enviado se perdería. Envíelos cuando tenga Internet.
          </span>
          <Mark n={50} />
        </div>
      )}
      {drafts.map((d) => (
        <div key={d.kind} className="banner t-blue home-draft" data-testid={`home-draft-${d.kind}`}>
          <RotateCcw size={22} aria-hidden />
          <span className="spacer">
            Tenía {KIND_TXT[d.kind]} sin terminar{d.label ? ` (${d.label})` : ''}
          </span>
          <button className="btn" onClick={() => setDiscard(d.kind)} data-testid="draft-discard">
            Descartar
          </button>
          <button className="btn btn-primary" onClick={() => navigate(draftRoute(d.kind, d.editingId))} data-testid="draft-continue">
            Continuar
          </button>
          <Mark n={51} />
        </div>
      ))}

      <section className="section">
        <h2>
          Hoy · {fmtLong(today)} <Mark n={55} />
        </h2>
        <div className="list">
          {hoy.length ? hoy.map((a) => <ActivityRow key={a.id} db={db} a={a} />) : <p className="muted">Sin actividades</p>}
        </div>
      </section>

      {attention.length > 0 && (
        <section className="section" data-testid="home-attention">
          <h2>
            Casos que requieren atención <Mark n={52} />
          </h2>
          <div className="list">
            {attention.map(({ c, r }) => (
              <a key={c.id} href={`#/casos/${c.id}`} className="item">
                <div className="grow">
                  <div className="title">{c.tipo}</div>
                  <div className="sub">
                    {c.codigo} · {partyNames(c.partes)}
                  </div>
                </div>
                <AttentionBadge r={r} />
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <h2>Próximos 7 días</h2>
        {manana.length > 0 && (
          <div className="banner t-amber home-tomorrow" data-testid="home-tomorrow">
            <Bell size={24} aria-hidden />
            <div className="col" style={{ gap: 0, flex: 1 }}>
              <strong>Mañana: {actividadesTxt(manana.length)}</strong>
              {manana.map((a) => {
                const v = vinculoInfo(db, a);
                const when = a.sinHora || !a.horaInicio ? 'Mañana' : `Mañana ${hm(a.horaInicio)}`;
                return (
                  <a key={a.id} href={`#/agenda/${a.id}`} className="home-tlink">
                    {when} · {a.categoria || a.titulo} · {v ? v.label : a.lugar}
                  </a>
                );
              })}
            </div>
            <Mark n={53} />
          </div>
        )}
        <div className="list">
          {next.map((a) => (
            <ActivityRow key={a.id} db={db} a={a} showDate />
          ))}
          {!next.length && !manana.length && <p className="muted">Sin actividades</p>}
        </div>
      </section>

      <div className="grid3 home-quick">
        <button className="btn btn-lg" data-testid="home-new-case" onClick={() => navigate('/casos/nuevo')}>
          <FolderPlus size={26} aria-hidden /> Nuevo caso
        </button>
        <button className="btn btn-lg" data-testid="home-new-act" onClick={() => navigate('/actuaciones/nueva')}>
          <FilePlus size={26} aria-hidden /> Nueva actuación
        </button>
        <button className="btn btn-lg" data-testid="home-new-activity" onClick={() => navigate('/agenda/nueva')}>
          <CalendarPlus size={26} aria-hidden /> Nueva actividad
        </button>
        <Mark n={54} />
      </div>

      {discard && (
        <Modal
          title={`¿Descartar ${KIND_TXT[discard]} sin terminar?`}
          onClose={() => setDiscard(null)}
          actions={
            <>
              <button className="btn" onClick={() => setDiscard(null)}>
                No, conservar
              </button>
              <button
                className="btn btn-danger"
                data-testid="draft-discard-confirm"
                onClick={() => {
                  setDraft(discard, null);
                  setDiscard(null);
                }}
              >
                Sí, descartar
              </button>
            </>
          }
        >
          Lo escrito se borrará de la tableta.
        </Modal>
      )}
    </div>
  );
}
