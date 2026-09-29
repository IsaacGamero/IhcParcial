import { ReactNode, useEffect, useState } from 'react';
import {
  AlertTriangle, CalendarDays, Check, CheckCircle, Clock, CloudCheck, Gavel, HelpCircle, MapPin, Mic, Tablet, Users, X, XCircle, Info,
} from 'lucide-react';
import type { ActEstado, ActividadEstado, CaseEstado, Categoria, SyncState } from '../lib/types';
import { params } from '../lib/params';
import { dismiss, useNotices } from '../lib/notices';

/** Marcador numerado del modo anotado (annotate=1). El número = ID en la matriz de justificación. */
export function Mark({ n }: { n: number }) {
  if (!params.annotate) return null;
  return (
    <span className="mark" data-mark={n} aria-hidden>
      {n}
    </span>
  );
}

/** Distintivo por registro (3.3). */
export function SyncBadge({ s }: { s: SyncState }) {
  if (s === 'sent')
    return (
      <span className="badge t-green" data-sync="sent">
        <CloudCheck size={16} aria-hidden /> Enviado
      </span>
    );
  if (s === 'review')
    return (
      <span className="badge t-red" data-sync="review">
        <AlertTriangle size={16} aria-hidden /> Revisar
      </span>
    );
  return (
    <span className="badge t-amber" data-sync="local">
      <Tablet size={16} aria-hidden /> En la tableta
    </span>
  );
}

export function DraftTag({ missing }: { missing: string[] }) {
  if (!missing.length) return null;
  return <span className="tag-draft">Borrador · falta: {missing.join(', ')}</span>;
}

const caseTone: Record<CaseEstado, string> = { 'En trámite': 't-blue', 'En conciliación': 't-blue', Concluido: 't-green' };
export function CaseStateBadge({ e }: { e: CaseEstado }) {
  const Icon = e === 'Concluido' ? CheckCircle : e === 'En conciliación' ? Users : Clock;
  return (
    <span className={`badge ${caseTone[e]}`}>
      <Icon size={16} aria-hidden /> {e}
    </span>
  );
}
export function ActStateBadge({ e }: { e: ActEstado }) {
  const Icon = e === 'Concluida' ? CheckCircle : e === 'Atendida' ? Check : Clock;
  const tone = e === 'Concluida' ? 't-green' : e === 'Atendida' ? 't-blue' : 't-amber';
  return (
    <span className={`badge ${tone}`}>
      <Icon size={16} aria-hidden /> {e}
    </span>
  );
}
export function AttentionBadge({ r }: { r: string | null }) {
  if (!r) return null;
  return (
    <span className={`badge ${r === 'Cita vencida' ? 't-red' : 't-amber'}`}>
      <AlertTriangle size={16} aria-hidden /> {r}
    </span>
  );
}

export const CAT_ICON: Record<Categoria, typeof Gavel> = { Audiencia: Gavel, Reunión: Users, 'Visita a comunidad': MapPin, Otra: CalendarDays };
export const CAT_CLASS: Record<Categoria, string> = { Audiencia: 'audiencia', Reunión: 'reunion', 'Visita a comunidad': 'visita', Otra: 'otra' };
export function CategoryTag({ c }: { c: Categoria | '' }) {
  if (!c) return null;
  const Icon = CAT_ICON[c];
  const k = CAT_CLASS[c];
  return (
    <span className="badge" style={{ background: `var(--cat-${k}-soft)`, color: `var(--cat-${k})` }}>
      <Icon size={16} aria-hidden /> {c}
    </span>
  );
}
export function ActivityStateTag({ e }: { e: ActividadEstado }) {
  const Icon = e === 'Realizada' ? CheckCircle : e === 'Cancelada' ? XCircle : Clock;
  const tone = e === 'Realizada' ? 't-green' : e === 'Cancelada' ? 't-gray' : 't-blue';
  return (
    <span className={`badge ${tone}`}>
      <Icon size={16} aria-hidden /> {e}
    </span>
  );
}

/** Campo con etiqueta: "(opcional)" en texto, línea de condicional, ayuda, error y "Modificado". */
export function Field(props: {
  label: string;
  optional?: boolean;
  cond?: string;
  help?: string;
  error?: string;
  modified?: boolean;
  htmlFor?: string;
  mark?: number;
  children: ReactNode;
}) {
  const [showHelp, setShowHelp] = useState(false);
  return (
    <div className="field" data-field={props.label}>
      <label htmlFor={props.htmlFor} className="label">
        {props.label}
        {props.optional && <span className="opt">(opcional)</span>}
        {props.modified && <span className="mod-tag">Modificado</span>}
        {props.help && (
          <button type="button" className="btn btn-ghost btn-icon" aria-label={`Ayuda: ${props.label}`} onClick={() => setShowHelp((v) => !v)}>
            <HelpCircle size={22} aria-hidden />
          </button>
        )}
        {props.mark !== undefined && <Mark n={props.mark} />}
      </label>
      {props.cond && <div className="cond">{props.cond}</div>}
      {showHelp && props.help && (
        <div className="hint" role="note">
          <Info size={16} aria-hidden /> {props.help}
        </div>
      )}
      {props.children}
      {props.error && (
        <div className="err" role="alert">
          <AlertTriangle size={18} aria-hidden /> {props.error}
        </div>
      )}
    </div>
  );
}

/** Botones segmentados (aria-pressed). */
export function Seg<T extends string>(props: {
  value: T | '';
  options: readonly T[];
  onChange: (v: T) => void;
  icons?: Partial<Record<T, ReactNode>>;
  label?: string;
}) {
  return (
    <div className="seg" role="group" aria-label={props.label}>
      {props.options.map((o) => (
        <button type="button" key={o} aria-pressed={props.value === o} onClick={() => props.onChange(o)}>
          {props.icons?.[o]}
          {o}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ step, total = 3, title }: { step: number; total?: number; title: string }) {
  return (
    <div>
      <div className="stepper" aria-label={`Paso ${step} de ${total}`}>
        <span>
          Paso {step} de {total}
        </span>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`dot ${i < step ? 'on' : ''}`} />
        ))}
      </div>
      <h2>{title}</h2>
    </div>
  );
}

/** Barra inferior: acción principal siempre abajo a la derecha (H4). */
export function ActionBar({ left, children }: { left?: ReactNode; children: ReactNode }) {
  return (
    <div className="actionbar">
      {left && <div className="left">{left}</div>}
      {children}
    </div>
  );
}

export function Modal({ title, children, onClose, actions }: { title: string; children?: ReactNode; onClose?: () => void; actions?: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal">
        <div className="row">
          <h2 style={{ margin: 0 }}>{title}</h2>
          <span className="spacer" />
          {onClose && (
            <button className="btn btn-ghost btn-icon" aria-label="Cerrar" onClick={onClose}>
              <X size={24} aria-hidden />
            </button>
          )}
        </div>
        <div style={{ marginTop: 12 }}>{children}</div>
        {actions && <div className="actions">{actions}</div>}
      </div>
    </div>
  );
}

/** Ayuda de dictado por el teclado del sistema (sin micrófono propio, 3.8). */
export function DictationHint() {
  return (
    <div className="hint">
      <Mic size={16} aria-hidden /> Puede hablar en vez de escribir: toque el micrófono del teclado.
    </div>
  );
}

const toneClass = { info: 't-blue', success: 't-green', warning: 't-amber', error: 't-red', neutral: 't-gray' };
export function Toasts() {
  const list = useNotices();
  return (
    <div className="toasts" aria-live="polite">
      {list.map((n) => (
        <div key={n.id} className={`toast ${toneClass[n.tone]}`} role="status">
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>{n.title}</div>
            {n.text && <div>{n.text}</div>}
            {n.badge && (
              <div style={{ marginTop: 6 }}>
                <SyncBadge s={n.badge === 'local' ? 'local' : 'sent'} />
              </div>
            )}
            {n.actions && (
              <div className="row" style={{ marginTop: 8 }}>
                {n.actions.map((a) => (
                  <button
                    key={a.label}
                    className={`btn ${a.primary ? 'btn-primary' : ''}`}
                    onClick={() => {
                      dismiss(n.id);
                      a.onClick();
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn btn-ghost btn-icon" aria-label="Cerrar aviso" onClick={() => dismiss(n.id)}>
            <X size={22} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
