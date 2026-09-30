// OWNER: agente-envio — P-00b Ayuda
import { PlayCircle } from 'lucide-react';
import { navigate } from '../lib/router';
import { FontSizePicker } from '../shell/FontSize';

export default function Ayuda() {
  return (
    <div className="col" style={{ gap: 24 }}>
      <h1>Ayuda</h1>
      <div>
        <button className="btn btn-lg" data-testid="help-intro" onClick={() => navigate('/intro')}>
          <PlayCircle size={24} aria-hidden /> Ver la introducción
        </button>
      </div>
      <div>
        <h2>Tamaño de letra</h2>
        <FontSizePicker />
      </div>
    </div>
  );
}
