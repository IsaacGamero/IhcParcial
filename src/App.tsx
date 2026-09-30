// OWNER: agente-envio (shell: PIN, introducción, recuperación, batería, orientación, bloqueo, P-10)
import { useCallback, useEffect, useRef, useState } from 'react';
import { Layout } from './components/Layout';
import { navigate, useRoute } from './lib/router';
import { isPc, params } from './lib/params';
import { getDB, setMeta, useDB } from './lib/store';
import type { FormDraft } from './lib/types';
import Inicio from './pages/Inicio';
import CasosList from './pages/casos/CasosList';
import CasoForm from './pages/casos/CasoForm';
import CasoDetail from './pages/casos/CasoDetail';
import ActuacionesList from './pages/actuaciones/ActuacionesList';
import ActuacionForm from './pages/actuaciones/ActuacionForm';
import ActuacionDetail from './pages/actuaciones/ActuacionDetail';
import Agenda from './pages/agenda/Agenda';
import ActividadForm from './pages/agenda/ActividadForm';
import ActividadDetail from './pages/agenda/ActividadDetail';
import Envio from './pages/Envio';
import Ayuda from './pages/Ayuda';
import PcView from './pages/pc/PcView';
import { PinScreen } from './shell/PinScreen';
import { Intro } from './shell/Intro';
import { Recovery, latestDraft } from './shell/Recovery';
import { ConnectionWatcher, RotateOverlay, useIdleLock } from './shell/Watchers';

function Page() {
  const { parts } = useRoute();
  const [a, b, c] = parts;
  // P-10: en la computadora, las listas muestran lo que ya llegó al Poder Judicial.
  if (isPc() && !b) {
    if (!a) return <PcView />;
    if (a === 'casos' || a === 'actuaciones' || a === 'agenda') return <PcView section={a} />;
  }
  if (a === 'casos') {
    if (b === 'nuevo') return <CasoForm />;
    if (b && c === 'editar') return <CasoForm id={b} />;
    if (b) return <CasoDetail id={b} />;
    return <CasosList />;
  }
  if (a === 'actuaciones') {
    if (b === 'nueva') return <ActuacionForm />;
    if (b && c === 'editar') return <ActuacionForm id={b} />;
    if (b) return <ActuacionDetail id={b} />;
    return <ActuacionesList />;
  }
  if (a === 'agenda') {
    if (b === 'nueva') return <ActividadForm />;
    if (b && c === 'editar') return <ActividadForm id={b} />;
    if (b) return <ActividadDetail id={b} />;
    return <Agenda />;
  }
  if (a === 'envio') return <Envio />;
  if (a === 'ayuda') return <Ayuda />;
  return <Inicio />;
}

export default function App() {
  const db = useDB();
  const { path, query } = useRoute();
  const pc = isPc();
  const [unlocked, setUnlocked] = useState(params.pinSkip || sessionStorage.getItem('jc-unlocked') === '1');
  const [everUnlocked, setEverUnlocked] = useState(unlocked);
  const [recoveryDone, setRecoveryDone] = useState(false);
  const recovery = useRef<FormDraft | null | undefined>(undefined);

  useEffect(() => {
    const f = params.font === 'large' || params.font === 'xlarge' ? params.font : db.meta.fontSize;
    document.documentElement.dataset.font = f;
    document.documentElement.dataset.device = params.device;
  }, [db.meta.fontSize]);

  const unlock = () => {
    sessionStorage.setItem('jc-unlocked', '1');
    setUnlocked(true);
    setEverUnlocked(true);
  };
  const lock = useCallback(() => {
    sessionStorage.removeItem('jc-unlocked');
    setUnlocked(false);
  }, []);
  // Bloqueo automático tras 5 minutos sin uso.
  useIdleLock(lock, unlocked && !params.pinSkip);

  if (!everUnlocked)
    return (
      <>
        <PinScreen onUnlock={unlock} />
        <RotateOverlay />
      </>
    );

  // P-00b: la primera vez tras el PIN (con pin=skip solo si se pide #/intro).
  const showIntro = path === '/intro' || (!pc && !params.pinSkip && !db.meta.onboarded);
  if (showIntro)
    return (
      <>
        <Intro
          onDone={() => {
            setMeta({ onboarded: true });
            if (path === '/intro') navigate('/');
          }}
        />
        <RotateOverlay />
      </>
    );

  // Recuperación (3.5): una sola vez por carga, con lo que había al abrir.
  if (recovery.current === undefined) recovery.current = pc ? null : latestDraft(getDB().drafts);
  const showRecovery = !!recovery.current && !recoveryDone && !!getDB().drafts[recovery.current.kind];

  return (
    <>
      <Layout onLock={lock}>{showRecovery ? null : <Page key={path + (query.get('continuar') || '')} />}</Layout>
      {showRecovery && <Recovery draft={recovery.current!} onDone={() => setRecoveryDone(true)} />}
      <ConnectionWatcher />
      {!unlocked && <PinScreen onUnlock={unlock} />}
      <RotateOverlay />
    </>
  );
}
