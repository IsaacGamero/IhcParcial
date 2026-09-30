// OWNER: agente-envio — P-00 Ingreso con PIN
import { useEffect, useState } from 'react';
import { Delete, Lock } from 'lucide-react';
import { getDB } from '../lib/store';
import { Mark } from '../components/ui';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export function PinScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState(false);

  const press = (k: string) => {
    if (k === 'del') return setPin(pin.slice(0, -1));
    setError(false);
    const n = (pin + k).slice(0, 4);
    if (n.length < 4) return setPin(n);
    // Se valida contra el PIN guardado en la tableta: funciona sin Internet.
    if (n === getDB().meta.pin) {
      setPin(n);
      setTimeout(onUnlock, 120);
    } else {
      setPin('');
      setError(true);
    }
  };

  useEffect(() => {
    if (forgot) return;
    const k = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('del');
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  if (forgot)
    return (
      <div className="pin-screen" role="dialog" aria-modal="true" aria-label="¿Olvidó su PIN?">
        <form
          className="pin-box"
          onSubmit={(e) => {
            e.preventDefault();
            if (/^\d{6}$/.test(code)) onUnlock();
            else setCodeErr(true);
          }}
        >
          <h1>¿Olvidó su PIN?</h1>
          <p>Llame a la sede del Poder Judicial. Le darán un código para desbloquear la tableta.</p>
          <div className="field">
            <label htmlFor="pin-code" className="label">
              Código
            </label>
            <input
              id="pin-code"
              data-testid="pin-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ''));
                setCodeErr(false);
              }}
              className={codeErr ? 'invalid' : ''}
              autoFocus
            />
            {codeErr && (
              <div className="err" role="alert">
                Escriba los 6 números del código.
              </div>
            )}
          </div>
          <div className="row">
            <button type="button" className="btn btn-lg" onClick={() => setForgot(false)}>
              Volver
            </button>
            <span className="spacer" />
            <button type="submit" className="btn btn-primary btn-lg" data-testid="pin-code-ok">
              Desbloquear
            </button>
          </div>
        </form>
      </div>
    );

  return (
    <div className="pin-screen" role="dialog" aria-modal="true" aria-label="Ingreso con PIN">
      <div className="pin-box">
        <Lock size={40} aria-hidden className="pin-lock" />
        <h1>Ingrese su PIN</h1>
        <div className="pin-dots" role="img" aria-label={`${pin.length} de 4 números`}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={i < pin.length ? 'on' : ''} />
          ))}
        </div>
        <div className="err pin-err" role="alert" data-testid="pin-error">
          {error && 'PIN incorrecto. Intente otra vez.'}
          <Mark n={72} />
        </div>
        <div className="pin-pad">
          {KEYS.map((k, i) =>
            k === '' ? (
              <span key={i} />
            ) : (
              <button
                key={i}
                type="button"
                className="pin-key"
                data-testid={k === 'del' ? 'pin-key-del' : `pin-key-${k}`}
                aria-label={k === 'del' ? 'Borrar' : k}
                onClick={() => press(k)}
              >
                {k === 'del' ? <Delete size={30} aria-hidden /> : k}
              </button>
            ),
          )}
        </div>
        <Mark n={70} />
        <button type="button" className="btn btn-ghost" data-testid="pin-forgot" onClick={() => setForgot(true)}>
          ¿Olvidó su PIN?
        </button>
        <Mark n={71} />
      </div>
    </div>
  );
}
