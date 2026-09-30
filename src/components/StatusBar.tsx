// OWNER: agente-envio
import { Clock, CloudCheck, CloudUpload, Send, Wifi, WifiOff } from 'lucide-react';
import { useOnline } from '../lib/connectivity';
import { pendingRecords, useDB } from '../lib/store';
import { fmtDateTime } from '../lib/dates';
import { navigate } from '../lib/router';
import { isPc } from '../lib/params';
import { startSync } from '../lib/sync';
import { Mark } from './ui';

/** Barra de estado fija (3.2): conexión + datos + último envío, y [Enviar ahora] si aplica. */
export function StatusBar() {
  const db = useDB();
  const online = useOnline();
  const pending = pendingRecords(db).length;
  const running = db.syncRun?.status === 'running';
  // En la computadora no se muestran los pendientes de la tableta (el Poder Judicial no los conoce).
  if (isPc())
    return (
      <header className="statusbar" data-online={online}>
        <span className="brand">Justicia Cercana</span>
        <span className={`sb-item ${online ? 't-blue' : 't-gray'}`} data-testid="sb-net">
          {online ? <Wifi size={20} aria-hidden /> : <WifiOff size={20} aria-hidden />}
          {online ? 'Con Internet' : 'Sin Internet'}
        </span>
      </header>
    );
  return (
    <header className="statusbar" data-online={online} data-pending={pending}>
      <span className="brand">Justicia Cercana</span>
      <button className={`sb-item ${online ? 't-blue' : 't-gray'}`} data-testid="sb-net" onClick={() => navigate('/envio')}>
        {online ? <Wifi size={20} aria-hidden /> : <WifiOff size={20} aria-hidden />}
        {online ? 'Con Internet' : 'Sin Internet · puede seguir trabajando'}
      </button>
      <Mark n={1} />
      <button className={`sb-item ${pending ? 't-amber' : 't-green'}`} data-testid="sb-data" onClick={() => navigate('/envio')}>
        {pending ? <CloudUpload size={20} aria-hidden /> : <CloudCheck size={20} aria-hidden />}
        {pending ? `${pending} ${pending === 1 ? 'registro' : 'registros'} por enviar` : 'Todo enviado'}
      </button>
      <Mark n={2} />
      <button className="sb-item muted" data-testid="sb-last" onClick={() => navigate('/envio')}>
        <Clock size={18} aria-hidden /> Último envío: {db.meta.lastSentAt ? fmtDateTime(db.meta.lastSentAt) : '—'}
      </button>
      <span className="spacer" />
      {online && pending > 0 && !running && (
        <button className="btn btn-primary" data-testid="sb-send" onClick={() => startSync()}>
          <Send size={20} aria-hidden /> Enviar ahora
        </button>
      )}
      <Mark n={3} />
    </header>
  );
}
