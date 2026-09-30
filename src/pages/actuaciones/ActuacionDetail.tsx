// OWNER: agente-actuaciones — Detalle de actuación
import { ArrowLeft, FileText, Pencil } from 'lucide-react';
import { useDB } from '../../lib/store';
import { ACT_ESTADOS_AYUDA, missingActuacion } from '../../lib/domain';
import { fmtDate } from '../../lib/dates';
import { navigate } from '../../lib/router';
import { ActionBar, ActStateBadge, Mark, SyncBadge } from '../../components/ui';
import { RecordState, tipoLabel, tipoLegal } from './shared';

function Row({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div className="act-dl">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default function ActuacionDetail({ id }: { id?: string }) {
  const db = useDB();
  const a = db.actuaciones.find((x) => x.id === id);
  if (!a)
    return (
      <div>
        <h1>Actuación</h1>
        <p>No se encontró la actuación.</p>
        <button className="btn" onClick={() => navigate('/actuaciones')}>
          <ArrowLeft size={22} aria-hidden /> Actuaciones
        </button>
      </div>
    );
  const legal = tipoLegal(a.tipo);
  const docLabel = (t: string, n: string) => (n ? `${t} ${n}` : t);

  return (
    <div>
      <div className="act-head">
        <h1 style={{ margin: 0 }}>{tipoLabel(a)}</h1>
        {legal && <span className="legal">{legal}</span>}
        <div className="muted" data-testid="act-code">
          {a.codigo}
        </div>
      </div>

      <div className="row" style={{ margin: '12px 0 16px' }}>
        <ActStateBadge e={a.estado} />
        <span className="muted small">{ACT_ESTADOS_AYUDA[a.estado]}</span>
        <span data-testid="act-record">
          <RecordState missing={missingActuacion(a)} />
        </span>
        <SyncBadge s={a.sync} />
        <Mark n={43} />
      </div>

      <section className="card section">
        <dl className="act-dls">
          <Row label="Asunto" value={a.asunto} />
          <Row label="Fecha de solicitud" value={fmtDate(a.fechaSolicitud)} />
          {a.estado !== 'Pendiente' && <Row label="Fecha de atención" value={fmtDate(a.fechaAtencion)} />}
          {a.estado === 'Concluida' && <Row label="Resultado" value={a.resultado} />}
          {a.estado === 'Concluida' && <Row label="Fecha de entrega" value={fmtDate(a.fechaEntrega)} />}
          <Row label="Observaciones" value={a.observaciones} />
        </dl>
      </section>

      <section className="card section">
        <h2>Personas</h2>
        {a.participantes.length ? (
          <div className="list">
            {a.participantes.map((p) => (
              <div key={p.id} className="act-person">
                <strong>{p.nombre || 'Sin nombre'}</strong>
                {p.rol && <span className="badge t-gray">{p.rol}</span>}
                <span className="muted">
                  {[p.docTipo ? (p.docTipo === 'DNI' || p.docTipo === 'Carné de extranjería' || p.docTipo === 'Otro' ? docLabel(p.docTipo, p.docNumero) : p.docTipo) : '', p.comunidad, p.telefono]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Sin personas.</p>
        )}
      </section>

      {!!a.documentos.length && (
        <section className="card section">
          <h2>Documentos</h2>
          <div className="act-docs">
            {a.documentos.map((d) => (
              <div key={d.id} className="act-doc">
                {d.tipo === 'foto' && d.dataUrl ? (
                  <img src={d.dataUrl} alt={d.texto} />
                ) : (
                  <span>
                    <FileText size={18} aria-hidden /> {d.texto}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <ActionBar
        left={
          <button className="btn" onClick={() => navigate('/actuaciones')}>
            <ArrowLeft size={22} aria-hidden /> Actuaciones
          </button>
        }
      >
        <button className="btn btn-primary btn-lg" data-testid="edit-act" onClick={() => navigate(`/actuaciones/${a.id}/editar`)}>
          <Pencil size={22} aria-hidden /> Editar
        </button>
      </ActionBar>
    </div>
  );
}
