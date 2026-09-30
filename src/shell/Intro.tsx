// OWNER: agente-envio — P-00b Introducción inicial
import { useState } from 'react';
import { ClipboardList, Send, Tablet } from 'lucide-react';
import { Mark } from '../components/ui';

const SLIDES = [
  { icon: ClipboardList, text: 'Registre casos, trámites y citas' },
  { icon: Tablet, text: 'Funciona sin Internet: todo se guarda en la tableta' },
  { icon: Send, text: 'Cuando tenga Internet, toque el botón Enviar ahora' },
];

export function Intro({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const s = SLIDES[i];
  const last = i === SLIDES.length - 1;
  return (
    <div className="intro" role="dialog" aria-modal="true" aria-label="Introducción">
      <div className="intro-top">
        <button className="btn btn-lg" data-testid="intro-skip" onClick={onDone}>
          Saltar
        </button>
        <Mark n={74} />
      </div>
      <div className="intro-body" data-step={i + 1}>
        <s.icon size={140} strokeWidth={1.4} aria-hidden className="intro-icon" />
        <h1>{s.text}</h1>
        <Mark n={73} />
      </div>
      <div className="intro-bottom">
        <div className="pin-dots" aria-label={`${i + 1} de ${SLIDES.length}`}>
          {SLIDES.map((_, j) => (
            <span key={j} className={j <= i ? 'on' : ''} />
          ))}
        </div>
        <Mark n={75} />
        <span className="spacer" />
        <button className="btn btn-primary btn-lg" data-testid="intro-next" onClick={() => (last ? onDone() : setI(i + 1))}>
          {last ? 'Empezar' : 'Siguiente'}
        </button>
      </div>
    </div>
  );
}
