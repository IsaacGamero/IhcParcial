// OWNER: agente-envio (estructura común)
import { ReactNode, useState } from 'react';
import { ALargeSmall, CalendarDays, FileText, FolderOpen, HelpCircle, House, Lock } from 'lucide-react';
import { useRoute, navigate } from '../lib/router';
import { StatusBar } from './StatusBar';
import { Mark, Modal, Toasts } from './ui';
import { BatteryBanner } from '../shell/Watchers';
import { FontSizePicker } from '../shell/FontSize';

const NAV = [
  { to: '/', label: 'Inicio', icon: House, match: (p: string) => p === '/' },
  { to: '/casos', label: 'Casos', icon: FolderOpen, match: (p: string) => p.startsWith('/casos') },
  { to: '/actuaciones', label: 'Actuaciones', icon: FileText, match: (p: string) => p.startsWith('/actuaciones') },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays, match: (p: string) => p.startsWith('/agenda') },
];

/** Estructura común: barra de estado arriba + menú lateral fijo de 4 opciones (Hick). */
export function Layout({ children, onLock }: { children: ReactNode; onLock: () => void }) {
  const { path } = useRoute();
  const [font, setFont] = useState(false);
  return (
    <div className="app">
      <StatusBar />
      <nav className="sidenav" aria-label="Menú">
        {NAV.map((n) => (
          <a key={n.to} href={`#${n.to}`} className="navlink" aria-current={n.match(path) ? 'page' : undefined}>
            <n.icon size={26} aria-hidden /> {n.label}
          </a>
        ))}
        <Mark n={4} />
        <span className="spacer" />
        <button className="navlink" onClick={() => navigate('/ayuda')} aria-current={path === '/ayuda' ? 'page' : undefined}>
          <HelpCircle size={26} aria-hidden /> Ayuda
        </button>
        <button className="navlink" data-testid="nav-font" onClick={() => setFont(true)}>
          <ALargeSmall size={26} aria-hidden /> Letra
        </button>
        <Mark n={81} />
        <button className="navlink" data-testid="nav-lock" onClick={onLock}>
          <Lock size={26} aria-hidden /> Bloquear
        </button>
      </nav>
      <main className="main">
        <BatteryBanner />
        {children}
      </main>
      {font && (
        <Modal
          title="Tamaño de letra"
          onClose={() => setFont(false)}
          actions={
            <button className="btn btn-primary btn-lg" onClick={() => setFont(false)}>
              Listo
            </button>
          }
        >
          <FontSizePicker />
        </Modal>
      )}
      <Toasts />
    </div>
  );
}
