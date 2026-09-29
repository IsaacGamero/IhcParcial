// OWNER: agente-envio (shell: PIN, introducción, recuperación, batería, orientación, bloqueo, P-10)
import { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { useRoute } from './lib/router';
import { params } from './lib/params';
import { useDB } from './lib/store';
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

function Page() {
  const { parts } = useRoute();
  const [a, b, c] = parts;
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
  const [unlocked, setUnlocked] = useState(params.pinSkip || sessionStorage.getItem('jc-unlocked') === '1');
  useEffect(() => {
    const f = params.font === 'large' || params.font === 'xlarge' ? params.font : db.meta.fontSize;
    document.documentElement.dataset.font = f;
    document.documentElement.dataset.device = params.device;
  }, [db.meta.fontSize]);
  const lock = () => {
    sessionStorage.removeItem('jc-unlocked');
    setUnlocked(false);
  };
  if (!unlocked) {
    // TODO agente-envio: pantalla PIN (P-00)
    sessionStorage.setItem('jc-unlocked', '1');
    setUnlocked(true);
    return null;
  }
  return (
    <Layout onLock={lock}>
      <Page />
    </Layout>
  );
}
