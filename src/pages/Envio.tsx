// OWNER: agente-envio — P-09 Envío al Poder Judicial
import { useState, type ReactNode } from 'react';
import { AlertTriangle, CloudCheck, Info, LoaderCircle, RotateCcw, Send, WifiOff, XCircle } from 'lucide-react';
import type { ConflictInfo, SyncItemResult } from '../lib/types';
import { pendingRecords, useDB } from '../lib/store';
import { useOnline } from '../lib/connectivity';
import { chooseVersions, recordLabel, startSync } from '../lib/sync';
import { fmtDateTime, fmtShort } from '../lib/dates';
import { ActionBar, Mark, Modal, SyncBadge } from '../components/ui';

function ItemState({ s }: { s: SyncItemResult['status'] }) {
  if (s === 'sending')
    return (
      <span className="badge t-blue">
        <LoaderCircle size={16} aria-hidden className="spin" /> Enviando
      </span>
    );
  if (s === 'sent' || s === 'conflict') return <SyncBadge s="sent" />;
  return <SyncBadge s="local" />;
}

function resultText(status: string, total: number, sent: number) {
  const rest = total - sent;
  if (status === 'ok' || status === 'conflict')
    return `${total === 1 ? 'Se envió el registro' : `Se enviaron los ${total} registros`}. Todo está guardado en el Poder Judicial.`;
  if (status === 'partial')
    return `Se enviaron ${sent} de ${total}. Se cortó el Internet. ${rest === 1 ? 'El otro sigue seguro' : `Los otros ${rest} siguen seguros`} en la tableta.`;
  return `El Poder Judicial no respondió. ${total === 1 ? 'Su registro sigue seguro' : `Sus ${total} registros siguen seguros`} en la tableta. Intente más tarde.`;
}

function CompareModal({ c, onClose }: { c: ConflictInfo; onClose: () => void }) {
  const [choice, setChoice] = useState<Record<string, 'tablet' | 'pc'>>(Object.fromEntries(c.fields.map((f) => [f.field, f.used])));
  return (
    <Modal
      title={c.codigo}
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-lg" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary btn-lg"
            data-testid="conflict-save"
            onClick={() => {
              chooseVersions(c, choice);
              onClose();
            }}
          >
            Guardar
          </button>
        </>
      }
    >
      {c.fields.map((f) => (
        <div key={f.field} className="field">
          <div className="label">
            {f.label} <Mark n={86} />
          </div>
          <div className="grid2">
            {(['tablet', 'pc'] as const).map((v) => (
              <button
                key={v}
                type="button"
                className="choice"
                aria-pressed={choice[f.field] === v}
                data-testid={`conflict-use-${v}`}
                onClick={() => setChoice({ ...choice, [f.field]: v })}
              >
                <strong>{v === 'tablet' ? 'Tableta' : `Computadora, ${fmtDateTime(f.pcDate)}`}</strong>
                <span>{(v === 'tablet' ? f.tablet : f.pc) || '—'}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </Modal>
  );
}

export default function Envio() {
  const db = useDB();
  const online = useOnline();
  const pending = pendingRecords(db);
  const run = db.syncRun;
  const [compare, setCompare] = useState<ConflictInfo | null>(null);

  const running = run?.status === 'running';
  const showResult = !!run && !running && pending.every((p) => run.items.some((it) => it.id === p.id && it.kind === p.kind));

  let body;
  let action = null;
  if (running && run) {
    const sendingIdx = run.items.findIndex((it) => it.status === 'sending');
    const n = sendingIdx >= 0 ? sendingIdx + 1 : run.done;
    const pct = Math.round((run.done / run.total) * 100);
    body = (
      <div className="card sync-card" data-testid="sync-progress" aria-live="polite">
        <div className="row">
          <LoaderCircle size={28} aria-hidden className="spin t-icon-blue" />
          <strong className="sync-title">
            Enviando {n} de {run.total}…
          </strong>
          <span className="spacer" />
          <strong>{pct} %</strong>
          <Mark n={82} />
        </div>
        <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  } else if (showResult && run) {
    const sent = run.items.filter((it) => it.status === 'sent' || it.status === 'conflict').length;
    const tone = run.status === 'error' ? 't-red' : run.status === 'partial' ? 't-amber' : 't-green';
    const Icon = run.status === 'error' ? XCircle : run.status === 'partial' ? AlertTriangle : CloudCheck;
    const failed = run.status === 'error' || run.status === 'partial';
    body = (
      <div className={`banner sync-result ${tone}`} data-testid="sync-result" data-status={run.status} role="status">
        <Icon size={32} aria-hidden />
        <div className="col" style={{ gap: 4 }}>
          <span>{resultText(run.status, run.total, sent)}</span>
          {run.conflicts.map((c) => {
            const used = c.fields.filter((f) => f.used === 'pc');
            if (!used.length) return null;
            return (
              <span key={c.id} className="conflict-line" data-testid="sync-conflict">
                <Info size={20} aria-hidden /> Se usó la versión de la computadora del {fmtShort(used[0].pcDate)} en: {used.map((f) => f.label).join(', ')}.
                <Mark n={85} />
              </span>
            );
          })}
          {failed && !online && (
            <span className="muted">
              <WifiOff size={18} aria-hidden /> Se enviarán cuando haya Internet.
            </span>
          )}
        </div>
        {failed && <Mark n={84} />}
      </div>
    );
    if (failed)
      action = (
        <button className="btn btn-primary btn-lg" data-testid="sync-retry" disabled={!online} onClick={() => startSync()}>
          <RotateCcw size={22} aria-hidden /> Reintentar
        </button>
      );
    else if (run.conflicts.length)
      action = (
        <button className="btn btn-lg" data-testid="sync-view-change" onClick={() => setCompare(run.conflicts[0])}>
          Ver y cambiar
        </button>
      );
  } else if (!pending.length) {
    body = (
      <div className="banner t-green" data-testid="sync-all-sent">
        <CloudCheck size={28} aria-hidden /> Todo enviado
      </div>
    );
  } else {
    body = !online ? (
      <div className="banner t-gray" data-testid="sync-offline">
        <WifiOff size={24} aria-hidden /> Se enviarán cuando haya Internet.
      </div>
    ) : null;
    action = online ? (
      <button className="btn btn-primary btn-lg" data-testid="envio-send" onClick={() => startSync()}>
        <Send size={22} aria-hidden /> Enviar ahora
      </button>
    ) : null;
  }

  const rows: { key: string; label: string; codigo: string; state: ReactNode }[] =
    run && (running || showResult)
      ? run.items.map((it) => ({ key: it.kind + it.id, label: it.label, codigo: it.codigo, state: <ItemState s={it.status} /> }))
      : pending.map((p) => ({ key: p.kind + p.id, label: recordLabel(db, p), codigo: p.codigo, state: <SyncBadge s="local" /> }));

  return (
    <div className="envio">
      <h1>Enviar al Poder Judicial</h1>
      {body}
      {rows.length > 0 && (
        <ul className="list sync-list" data-testid="sync-list">
          {rows.map((r) => (
            <li key={r.key} className="item">
              <div className="grow">
                <div className="title">{r.label}</div>
                <div className="sub">{r.codigo}</div>
              </div>
              {r.state}
            </li>
          ))}
          <Mark n={83} />
        </ul>
      )}
      {action && <ActionBar>{action}</ActionBar>}
      {compare && <CompareModal c={compare} onClose={() => setCompare(null)} />}
    </div>
  );
}
