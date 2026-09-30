// OWNER: agente-envio — Tamaño de letra (3.10): se recuerda en la tableta.
import { setMeta, useDB } from '../lib/store';
import type { Meta } from '../lib/types';

const OPTS: { v: Meta['fontSize']; label: string; px: number }[] = [
  { v: 'normal', label: 'Normal', px: 18 },
  { v: 'large', label: 'Grande', px: 21 },
  { v: 'xlarge', label: 'Muy grande', px: 24 },
];

export function FontSizePicker() {
  const db = useDB();
  return (
    <div className="seg" role="group" aria-label="Tamaño de letra">
      {OPTS.map((o) => (
        <button
          key={o.v}
          type="button"
          aria-pressed={db.meta.fontSize === o.v}
          data-testid={o.v === 'normal' ? 'font-normal' : o.v === 'large' ? 'font-large' : 'font-xlarge'}
          onClick={() => setMeta({ fontSize: o.v })}
          style={{ fontSize: o.px }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
