// OWNER: agente-casos
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Save, Undo2 } from 'lucide-react';
import type { Caso, CaseEstado } from '../../lib/types';
import { getDB, nextCode, peekCode, saveCase, setDraft, uid, useDB } from '../../lib/store';
import { useRoute, navigate } from '../../lib/router';
import { useAutosave } from '../../lib/autosave';
import { notify } from '../../lib/notices';
import { fmtDate, fmtDateTime, fmtShort, nowISO, todayISO } from '../../lib/dates';
import { CASE_ESTADOS, TIPOS_CONFLICTO, TIPOS_CONFLICTO_AYUDA, emptyParty, missingCaso, validateParty } from '../../lib/domain';
import { ActionBar, DictationHint, DraftTag, Field, Mark, Seg, Stepper } from '../../components/ui';
import { PartyEditor } from '../../components/PartyEditor';
import { LABELS, citaError, joinCita, notifyScheduled, scheduleFromCase } from './shared';

interface FormState {
  caso: Caso;
  proxFecha: string;
  proxHora: string;
}

const TITLES = ['El problema', 'Las personas', 'Próxima cita y guardar'];

function emptyCase(): Caso {
  const now = nowISO();
  return {
    id: uid(),
    codigo: '',
    fechaRegistro: todayISO(),
    tipo: '',
    tipoOtro: '',
    descripcion: '',
    estado: 'En trámite',
    resultado: '',
    observaciones: '',
    partes: [emptyParty(), emptyParty()],
    avances: [],
    proximaCita: null,
    evidencias: [],
    historial: [],
    sync: 'local',
    createdAt: now,
    updatedAt: now,
  };
}

function fromCase(c: Caso): FormState {
  const cita = c.proximaCita || '';
  return { caso: JSON.parse(JSON.stringify(c)), proxFecha: cita.slice(0, 10), proxHora: cita.length > 10 ? cita.slice(11, 16) : '' };
}

type Errors = Record<string, string | undefined>;

function stepErrors(step: number, s: FormState, base: FormState | null): Errors {
  const c = s.caso;
  const e: Errors = {};
  if (step === 1) {
    if (c.fechaRegistro > todayISO()) e.fechaRegistro = 'La fecha no puede ser posterior a hoy.';
    if (!c.tipo) e.tipo = 'Elija de qué trata el problema.';
    else if (c.tipo === 'Otro' && !c.tipoOtro.trim()) e.tipo = 'Escriba de qué trata.';
    if (!c.descripcion.trim()) e.descripcion = 'Cuente brevemente qué pasó.';
    if (c.estado === 'Concluido' && !c.resultado.trim()) e.resultado = 'Para cerrar el caso, escriba el acuerdo o resultado.';
  }
  if (step === 2) {
    if (c.partes.some((p) => Object.keys(validateParty(p)).length)) e.partes = 'x';
    if (!c.partes.some((p) => p.rol === 'Solicitante')) e.solicitante = 'El caso necesita al menos una persona que lo solicite.';
  }
  // Una cita ya registrada (aunque esté vencida) no se vuelve a validar al editar.
  if (step === 3 && (!base || base.proxFecha !== s.proxFecha)) e.cita = citaError(s.proxFecha);
  Object.keys(e).forEach((k) => e[k] === undefined && delete e[k]);
  return e;
}

function changedFields(a: FormState, b: FormState): string[] {
  const out: string[] = [];
  const x = a.caso;
  const y = b.caso;
  const keys: (keyof Caso)[] = ['fechaRegistro', 'tipo', 'descripcion', 'estado', 'resultado', 'observaciones'];
  keys.forEach((k) => {
    if (k === 'tipo' ? x.tipo !== y.tipo || x.tipoOtro !== y.tipoOtro : x[k] !== y[k]) out.push(k);
  });
  if (JSON.stringify(x.partes) !== JSON.stringify(y.partes)) out.push('partes');
  if (joinCita(a.proxFecha, a.proxHora) !== joinCita(b.proxFecha, b.proxHora)) out.push('proximaCita');
  return out;
}

export default function CasoForm({ id }: { id?: string }) {
  const db = useDB();
  const { query } = useRoute();
  const original = id ? db.cases.find((c) => c.id === id) : undefined;
  const editing = !!id;

  const [init] = useState(() => {
    const d = getDB().drafts.caso;
    const orig = id ? getDB().cases.find((c) => c.id === id) : undefined;
    if (query.get('continuar') === '1' && d && (d.editingId || null) === (id || null)) {
      return { state: d.data as FormState, step: d.step || 1, continued: true, orig };
    }
    return { state: orig ? fromCase(orig) : { caso: emptyCase(), proxFecha: '', proxHora: '' }, step: 1, continued: false, orig };
  });
  const base = useMemo(() => (init.orig ? fromCase(init.orig) : null), [init]);
  const [s, setS] = useState<FormState>(init.state);
  const [step, setStep] = useState(init.step);
  const [shown, setShown] = useState<Record<number, boolean>>({});
  const touched = useRef(init.continued);

  const c = s.caso;
  const first = c.partes.find((p) => p.nombre.trim())?.nombre.trim().split(/\s+/).slice(0, 2).join(' ');
  const label = `${first || 'Caso nuevo'}, ${fmtShort(todayISO())}`;
  const auto = useAutosave('caso', id || null, step, s, label);
  const statusRef = useRef(auto.status);
  statusRef.current = auto.status;

  // Si se abrió y se dejó sin tocar nada, no queda un "caso sin terminar".
  useEffect(
    () => () => {
      if (!touched.current && statusRef.current) setDraft('caso', null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const set = (patch: Partial<Caso>) => {
    touched.current = true;
    setS((p) => ({ ...p, caso: { ...p.caso, ...patch } }));
  };
  const setProx = (patch: Partial<FormState>) => {
    touched.current = true;
    setS((p) => ({ ...p, ...patch }));
  };

  const changes = base ? changedFields(base, s) : [];
  const mod = (k: string) => editing && changes.includes(k);
  const errors = shown[step] ? stepErrors(step, s, base) : {};

  if (editing && !original && !init.orig) return <p>No se encontró el caso.</p>;

  const next = () => {
    const e = stepErrors(step, s, base);
    if (Object.keys(e).length) {
      setShown({ ...shown, [step]: true });
      return;
    }
    auto.saveNow();
    setStep(step + 1);
    window.scrollTo(0, 0);
  };
  const prev = () => {
    auto.saveNow();
    setStep(step - 1);
    window.scrollTo(0, 0);
  };

  const save = () => {
    // Siempre se puede guardar; lo incompleto queda Borrador. Solo se bloquean datos imposibles.
    const hard: [number, string | undefined][] = [
      [1, c.fechaRegistro > todayISO() ? 'x' : undefined],
      [3, stepErrors(3, s, base).cita],
    ];
    const bad = hard.find(([, v]) => v);
    if (bad) {
      setShown({ ...shown, [bad[0]]: true });
      setStep(bad[0]);
      return;
    }
    const cita = joinCita(s.proxFecha, s.proxHora);
    const now = nowISO();
    let agendado = '';
    if (!editing) {
      const codigo = nextCode('caso');
      const caso: Caso = {
        ...c,
        codigo,
        proximaCita: cita,
        createdAt: now,
        historial: [{ id: uid(), fecha: now, tipo: 'creado', texto: 'Registrado en la tableta', origen: 'tableta' }],
      };
      saveCase(caso);
      if (cita) agendado = scheduleFromCase(caso, cita);
      auto.clear();
      notify({ tone: 'info', title: `Caso ${codigo} guardado en la tableta`, text: 'Se enviará cuando haya Internet.', badge: 'local' });
      if (agendado) notifyScheduled(agendado);
      navigate(`/casos/${caso.id}`);
      return;
    }
    const names = changes.map((k) => LABELS[k]);
    if (!changes.length) {
      auto.clear();
      navigate(`/casos/${c.id}`);
      return;
    }
    const latest = getDB().cases.find((x) => x.id === c.id) || c;
    const caso: Caso = {
      ...latest,
      fechaRegistro: c.fechaRegistro,
      tipo: c.tipo,
      tipoOtro: c.tipoOtro,
      descripcion: c.descripcion,
      estado: c.estado,
      resultado: c.resultado,
      observaciones: c.observaciones,
      partes: c.partes,
      proximaCita: cita,
      historial: [...latest.historial, { id: uid(), fecha: now, tipo: 'editado', texto: `Cambios: ${names.join(', ')}`, origen: 'tableta' }],
    };
    saveCase(caso);
    if (cita && changes.includes('proximaCita')) agendado = scheduleFromCase(caso, cita);
    auto.clear();
    const n = names.length;
    notify({
      tone: 'info',
      title: n === 1 ? `Se guardó 1 cambio en la tableta: ${names[0]}.` : `Se guardaron ${n} cambios en la tableta: ${names.join(', ')}.`,
      text: 'Se enviará cuando haya Internet.',
      badge: 'local',
    });
    if (agendado) notifyScheduled(agendado);
    navigate(`/casos/${caso.id}`);
  };

  const undo = () => {
    if (!base) return;
    setS(JSON.parse(JSON.stringify(base)));
  };

  const cls = (k: string, err?: string) => [mod(k) ? 'modified' : '', err ? 'invalid' : ''].join(' ').trim() || undefined;
  const blur = auto.saveNow;
  const missing = missingCaso(c);

  return (
    <div className="caso-form">
      <div className="row">
        <h1 style={{ margin: 0 }}>{editing ? 'Editar datos' : 'Nuevo caso'}</h1>
        <span className="spacer" />
        {auto.status && (
          <span className="muted small" data-testid="autosave-status">
            {auto.status}
          </span>
        )}
        <Mark n={22} />
      </div>
      <Stepper step={step} title={TITLES[step - 1]} />
      <Mark n={15} />

      {step === 1 && (
        <div>
          <div className="grid2">
            <Field label="Código" htmlFor="c-codigo" mark={17}>
              <input id="c-codigo" data-testid="case-code" value={c.codigo || peekCode('caso')} readOnly className="casos-readonly" />
            </Field>
            <Field label="Fecha de registro" htmlFor="c-fecha" error={errors.fechaRegistro} modified={mod('fechaRegistro')}>
              <input
                id="c-fecha"
                type="date"
                max={todayISO()}
                value={c.fechaRegistro}
                onChange={(e) => set({ fechaRegistro: e.target.value })}
                onBlur={blur}
                className={cls('fechaRegistro', errors.fechaRegistro)}
              />
            </Field>
          </div>
          <Field label="Tipo de conflicto" error={errors.tipo} modified={mod('tipo')} mark={16}>
            <div className={`choices ${mod('tipo') ? 'casos-mod-box' : ''}`} role="group" aria-label="Tipo de conflicto">
              {TIPOS_CONFLICTO.map((t, i) => (
                <button
                  key={t}
                  type="button"
                  className="choice"
                  data-testid={`conflict-type-${i + 1}`}
                  aria-pressed={c.tipo === t}
                  onClick={() => {
                    set({ tipo: t, tipoOtro: t === 'Otro' ? c.tipoOtro : '' });
                  }}
                >
                  <strong>{t}</strong>
                  {TIPOS_CONFLICTO_AYUDA[t] && <span className="legal">{TIPOS_CONFLICTO_AYUDA[t]}</span>}
                </button>
              ))}
            </div>
          </Field>
          {c.tipo === 'Otro' && (
            <Field label="¿De qué trata?" htmlFor="c-otro" cond="Se pide porque eligió Otro">
              <input id="c-otro" value={c.tipoOtro} onChange={(e) => set({ tipoOtro: e.target.value })} onBlur={blur} />
            </Field>
          )}
          <Field label="Descripción del motivo" htmlFor="c-desc" error={errors.descripcion} modified={mod('descripcion')}>
            <textarea
              id="c-desc"
              data-testid="case-description"
              value={c.descripcion}
              onChange={(e) => set({ descripcion: e.target.value })}
              onBlur={blur}
              className={cls('descripcion', errors.descripcion)}
            />
            <DictationHint />
          </Field>
          <Field label="Estado" modified={mod('estado')}>
            <Seg<CaseEstado> label="Estado" value={c.estado} options={CASE_ESTADOS} onChange={(v) => set({ estado: v })} />
          </Field>
          {c.estado === 'Concluido' && (
            <Field label="Resultado o acuerdo" htmlFor="c-res" cond="Se pide cuando el caso está Concluido" error={errors.resultado} modified={mod('resultado')}>
              <textarea id="c-res" value={c.resultado} onChange={(e) => set({ resultado: e.target.value })} onBlur={blur} className={cls('resultado', errors.resultado)} />
              <DictationHint />
            </Field>
          )}
          <Field label="Observaciones" optional htmlFor="c-obs" modified={mod('observaciones')} mark={editing ? 23 : undefined}>
            <textarea
              id="c-obs"
              data-testid="case-observaciones"
              value={c.observaciones}
              onChange={(e) => set({ observaciones: e.target.value })}
              onBlur={blur}
              className={cls('observaciones')}
            />
            <DictationHint />
          </Field>
        </div>
      )}

      {step === 2 && (
        <div>
          {mod('partes') && <span className="mod-tag">Modificado</span>}
          {errors.solicitante && (
            <div className="err" role="alert" style={{ marginBottom: 12 }}>
              {errors.solicitante}
            </div>
          )}
          <PartyEditor
            parties={c.partes}
            onChange={(partes) => set({ partes })}
            roles={['Solicitante', 'Invitado', 'Testigo']}
            roleLabel="Rol"
            showErrors={!!shown[2]}
            onBlurSave={blur}
            markBase={19}
          />
        </div>
      )}

      {step === 3 && (
        <div>
          <Field label="Próxima fecha de atención" optional error={errors.cita} modified={mod('proximaCita')}>
            <div className="row">
              <input
                type="date"
                aria-label="Fecha"
                data-testid="next-date"
                min={todayISO()}
                value={s.proxFecha}
                onChange={(e) => setProx({ proxFecha: e.target.value })}
                onBlur={blur}
                className={cls('proximaCita', errors.cita)}
                style={{ width: 'auto' }}
              />
              <input
                type="time"
                aria-label="Hora"
                data-testid="next-time"
                value={s.proxHora}
                onChange={(e) => setProx({ proxHora: e.target.value })}
                onBlur={blur}
                className={cls('proximaCita')}
                style={{ width: 'auto' }}
              />
            </div>
          </Field>

          <section className="card casos-summary" aria-label="Resumen" data-testid="case-summary">
            <div className="row">
              <h2 style={{ margin: 0 }}>Resumen</h2>
              <Mark n={21} />
              <span className="spacer" />
              <DraftTag missing={missing} />
            </div>
            <dl>
              <dt>Código</dt>
              <dd>{c.codigo || peekCode('caso')}</dd>
              <dt>Fecha</dt>
              <dd>{fmtDate(c.fechaRegistro)}</dd>
              <dt>Problema</dt>
              <dd>{c.tipo === 'Otro' ? c.tipoOtro || 'Otro' : c.tipo || '—'}</dd>
              <dt>Qué pasó</dt>
              <dd>{c.descripcion || '—'}</dd>
              <dt>Estado</dt>
              <dd>{c.estado}</dd>
              {c.estado === 'Concluido' && (
                <>
                  <dt>Acuerdo</dt>
                  <dd>{c.resultado || '—'}</dd>
                </>
              )}
              <dt>Personas</dt>
              <dd>
                {c.partes.filter((p) => p.nombre.trim()).length
                  ? c.partes
                      .filter((p) => p.nombre.trim())
                      .map((p) => (
                        <div key={p.id}>
                          {p.nombre} · {p.rol || 'sin rol'}
                          {p.comunidad ? ` · ${p.comunidad}` : ''}
                          {p.docTipo === 'DNI' && p.docNumero ? ` · DNI ${p.docNumero}` : ''}
                        </div>
                      ))
                  : '—'}
              </dd>
              <dt>Próxima cita</dt>
              <dd>{s.proxFecha ? fmtDateTime(joinCita(s.proxFecha, s.proxHora)) : '—'}</dd>
              {c.observaciones.trim() && (
                <>
                  <dt>Observaciones</dt>
                  <dd>{c.observaciones}</dd>
                </>
              )}
            </dl>
          </section>
        </div>
      )}

      <ActionBar
        left={
          <>
            {step > 1 && (
              <button className="btn btn-lg" data-testid="step-back" onClick={prev}>
                <ChevronLeft size={24} aria-hidden /> Atrás
              </button>
            )}
            {editing && (
              <button className="btn btn-lg btn-ghost" data-testid="undo-changes" onClick={undo} disabled={!changes.length}>
                <Undo2 size={22} aria-hidden /> Deshacer cambios
              </button>
            )}
          </>
        }
      >
        <button
          className={`btn btn-lg ${step === 3 ? 'btn-primary' : ''}`}
          data-testid={editing ? 'save-changes' : 'save-case'}
          onClick={save}
        >
          <Save size={22} aria-hidden /> {editing ? 'Guardar cambios' : 'Guardar caso'}
        </button>
        {step < 3 && (
          <button className="btn btn-primary btn-lg" data-testid="step-next" onClick={next}>
            Siguiente <ChevronRight size={24} aria-hidden />
          </button>
        )}
        <Mark n={18} />
      </ActionBar>
    </div>
  );
}
