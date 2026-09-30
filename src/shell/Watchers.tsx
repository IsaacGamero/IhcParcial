// OWNER: agente-envio — avisos de conexión, envío automático, batería, orientación y bloqueo por inactividad.
import { useEffect, useRef, useState } from 'react';
import { BatteryLow, BatteryWarning, RotateCw, Send, WifiOff, X } from 'lucide-react';
import { useOnline } from '../lib/connectivity';
import { pendingRecords, useDB, getDB } from '../lib/store';
import { params, isPc } from '../lib/params';
import { startSync } from '../lib/sync';
import { navigate, useRoute } from '../lib/router';
import { notify } from '../lib/notices';
import { Mark } from '../components/ui';

const isFormRoute = (p: string) => /\/(nuevo|nueva|editar)$/.test(p);

/** Aviso gris al perder Internet y envío automático al recuperarlo (P-09). */
export function ConnectionWatcher() {
  const online = useOnline();
  const { path } = useRoute();
  const prev = useRef(online);
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    const was = prev.current;
    prev.current = online;
    if (was === online) return;
    if (!online) {
      setNotice(true);
      if (!params.freeze) {
        const t = setTimeout(() => setNotice(false), 9000);
        return () => clearTimeout(t);
      }
      return;
    }
    setNotice(false);
    if (isPc() || !pendingRecords(getDB()).length) return;
    // Envío automático: si la jueza está llenando un formulario no se la saca de él.
    if (isFormRoute(path)) {
      startSync({ go: false });
      notify({ tone: 'info', title: 'Enviando sus registros al Poder Judicial…', actions: [{ label: 'Ver', onClick: () => navigate('/envio') }] });
    } else startSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  if (!notice) return null;
  return (
    <div className="toast t-gray conn-notice" role="status" data-testid="offline-notice">
      <WifiOff size={24} aria-hidden />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700 }}>Se perdió el Internet.</div>
        <div>Lo que escribe se sigue guardando en la tableta.</div>
      </div>
      <Mark n={78} />
      <button className="btn btn-ghost btn-icon" aria-label="Cerrar aviso" onClick={() => setNotice(false)}>
        <X size={22} aria-hidden />
      </button>
    </div>
  );
}

interface BatteryManager extends EventTarget {
  level: number;
  charging: boolean;
}
function useBattery(): number | null {
  const [level, setLevel] = useState<number | null>(params.battery);
  useEffect(() => {
    if (params.battery !== null) return;
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManager> };
    if (!nav.getBattery) return;
    let bm: BatteryManager | null = null;
    const upd = () => bm && setLevel(bm.charging ? null : Math.round(bm.level * 100));
    nav.getBattery().then((b) => {
      bm = b;
      upd();
      b.addEventListener('levelchange', upd);
      b.addEventListener('chargingchange', upd);
    });
    return () => {
      bm?.removeEventListener('levelchange', upd);
      bm?.removeEventListener('chargingchange', upd);
    };
  }, []);
  return level;
}

/** Aviso de batería baja (3.9) bajo la barra de estado. */
export function BatteryBanner() {
  const level = useBattery();
  const db = useDB();
  const online = useOnline();
  if (level === null || level > 20 || isPc()) return null;
  const critical = level <= 10;
  const pending = pendingRecords(db).length;
  const Icon = critical ? BatteryWarning : BatteryLow;
  return (
    <div className={`banner battery ${critical ? 't-red critical' : 't-amber'}`} role="alert" data-testid="battery-banner" data-level={level}>
      <Icon size={critical ? 32 : 26} aria-hidden />
      <span className="spacer">Batería baja ({level} %). Lo que registró ya está guardado en la tableta.</span>
      <Mark n={79} />
      {online && pending > 0 && db.syncRun?.status !== 'running' && (
        <button className="btn btn-primary" data-testid="battery-send" onClick={() => startSync()}>
          <Send size={20} aria-hidden /> Enviar ahora
        </button>
      )}
    </div>
  );
}

/** Solo horizontal (3.11): en vertical se pide girar la tableta. Visible por CSS (.rotate). */
export function RotateOverlay() {
  if (isPc()) return null;
  return (
    <div className="rotate" data-testid="rotate-overlay" role="alert">
      <RotateCw size={120} strokeWidth={1.4} aria-hidden />
      <h1>Gire la tableta para usarla de lado</h1>
      <Mark n={80} />
    </div>
  );
}

/** Bloqueo automático tras 5 minutos sin uso. */
export function useIdleLock(onLock: () => void, enabled: boolean, ms = 5 * 60 * 1000) {
  const last = useRef(Date.now());
  useEffect(() => {
    if (!enabled) return;
    last.current = Date.now();
    const touch = () => (last.current = Date.now());
    const evs = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];
    evs.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const t = setInterval(() => Date.now() - last.current >= ms && onLock(), 5000);
    return () => {
      evs.forEach((e) => window.removeEventListener(e, touch));
      clearInterval(t);
    };
  }, [enabled, onLock, ms]);
}
