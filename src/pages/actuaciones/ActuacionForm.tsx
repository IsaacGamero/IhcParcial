// OWNER: agente-actuaciones — P-06 Actuación: nueva o edición (3 pasos)
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, Plus, Save, Trash2 } from 'lucide-react';
import type { ActEstado, Actuacion, Evidence, FormDraft } from '../../lib/types';
import { getDB, nextCode, peekCode, saveActuacion, setDraft, uid } from '../../lib/store';
import { ACT_ESTADOS, ACT_ESTADOS_AYUDA, TIPOS_ACTUACION, emptyParty, findDuplicateActuacion, missingActuacion, validateParty } from '../../lib/domain';
import { fmtDate, fmtShort, nowISO, todayISO } from '../../lib/dates';
import { useAutosave } from '../../lib/autosave';
import { navigate, useRoute } from '../../lib/router';
import { notify } from '../../lib/notices';
import { ActionBar, DictationHint, Field, Mark, Modal, Stepper } from '../../components/ui';
import { PartyEditor } from '../../components/PartyEditor';
import { RecordState, solicitante, tipoLabel } from './shared';

const TITLES = ['¿Qué trámite?', 'Las personas', 'Resultado'];
const FIRST = 4; // tarjetas visibles antes de [Ver más trámites]

type ErrKey = 'tipo' | 'tipoOtro' | 'asunto' | 'fechaSolicitud' | 'personas' | 'partes' | 'fechaAtencion' | 'resultado' | 'fechaEntrega';
type Errs = Partial<Record<ErrKey, string>>;

const MSG_CONCLUIR = 'Para concluir, escriba qué se entregó o qué constancia se emitió.';

function emptyAct(): Actuacion {
  return {
    id: uid(),
    codigo: '',
    fechaSolicitud: todayISO(),
    tipo: '',
    tipoOtro: '',
    asunto: '',
    estado: 'Pendiente',
    fechaAtencion: '',
    resultado: '',
    fechaEntrega: '',
    observaciones: '',
    participantes: [emptyParty('Solicitante')],
    documentos: [],
    historial: [],
    sync: 'local',
    createdAt: '',
    updatedAt: '',
  };
}

/** Validaciones y mensajes exactos de la tabla de P-06. */
function validateStep(a: Actuacion, step: number): Errs {
  const e: Errs = {};
  const today = todayISO();
  if (step === 1) {
    if (!a.tipo) e.tipo = 'Elija qué trámite le piden.';
    else if (a.tipo === 'Otra' && !a.tipoOtro.trim()) e.tipoOtro = 'Escriba qué trámite es.';
    if (!a.asunto.trim()) e.asunto = 'Cuente en pocas palabras qué necesita la persona.';
    if (!a.fechaSolicitud) e.fechaSolicitud = 'Indique la fecha de solicitud.';
    else if (a.fechaSolicitud > today) e.fechaSolicitud = 'La fecha de solicitud no puede ser posterior a hoy.';
  }
  if (step === 2) {
    const ok = a.participantes.filter((p) => Object.keys(validateParty(p)).length === 0);
    if (!ok.some((p) => p.rol === 'Solicitante')) e.personas = 'El trámite necesita al menos una persona que lo solicite.';
    if (ok.length !== a.participantes.length) e.partes = 'x';
  }
  if (step === 3 && a.estado !== 'Pendiente') {
    if (!a.fechaAtencion) e.fechaAtencion = 'Indique la fecha de atención.';
    else if (a.fechaSolicitud && a.fechaAtencion < a.fechaSolicitud) e.fechaAtencion = 'La atención no puede ser antes de la solicitud.';
    else if (a.fechaAtencion > today) e.fechaAtencion = 'La fecha de atención no puede ser posterior a hoy.';
    if (a.estado === 'Concluida') {
      if (!a.resultado.trim()) e.resultado = MSG_CONCLUIR;
      if (!a.fechaEntrega) e.fechaEntrega = 'Indique la fecha de entrega.';
      else if (a.fechaAtencion && a.fechaEntrega < a.fechaAtencion) e.fechaEntrega = 'La entrega no puede ser antes de la atención.';
    }
  }
  return e;
}

/** Campos comparados en la edición (resaltado "Modificado" y confirmación de cambios). */
const FIELDS: { key: keyof Actuacion | 'tipoFull'; label: string }[] = [
  { key: 'tipoFull', label: 'Tipo de actuación' },
  { key: 'asunto', label: 'Asunto' },
  { key: 'fechaSolicitud', label: 'Fecha de solicitud' },
  { key: 'participantes', label: 'Personas' },
  { key: 'estado', label: 'Estado de atención' },
  { key: 'fechaAtencion', label: 'Fecha de atención' },
  { key: 'resultado', label: 'Resultado' },
  { key: 'fechaEntrega', label: 'Fecha de entrega' },
  { key: 'observaciones', label: 'Observaciones' },
  { key: 'documentos', label: 'Documentos' },
];
function fieldValue(a: Actuacion, k: (typeof FIELDS)[number]['key']): string {
  if (k === 'tipoFull') return a.tipo + '|' + (a.tipo === 'Otra' ? a.tipoOtro.trim() : '');
  const v = a[k];
  return typeof v === 'string' ? v.trim() : JSON.stringify(v);
}

/** Reduce la foto para que quepa en la tableta (localStorage). */
function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(String(r.result));
      img.onload = () => {
        const max = 640;
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.7));
      };
      img.src = String(r.result);
    };
    r.readAsDataURL(file);
  });
}

export default function ActuacionForm({ id }: { id?: string }) {
  const { query } = useRoute();
  const continuar = query.get('continuar') === '1';
  // key: si la ruta cambia a ?continuar=1 con el formulario abierto, se vuelve a montar con el borrador.
  return <Form key={`${id || 'nueva'}-${continuar}`} id={id} continuar={continuar} />;
}

function Form({ id, continuar }: { id?: string; continuar: boolean }) {
  const init = useMemo(() => {
    const db = getDB();
    const draft = continuar ? (db.drafts.actuacion as FormDraft | undefined) : undefined;
    const editingId = draft ? draft.editingId : id || null;
    const original = editingId ? db.actuaciones.find((x) => x.id === editingId) || null : null;
    let data: Actuacion;
    if (draft) data = { ...emptyAct(), ...(draft.data as Actuacion) };
    else if (original) data = structuredClone(original);
    else data = emptyAct();
    return { data, step: draft ? Math.min(3, Math.max(1, draft.step || 1)) : 1, editingId, original, fromDraft: !!draft };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [a, setA] = useState<Actuacion>(init.data);
  const [step, setStep] = useState(init.step);
  const [shown, setShown] = useState<Record<number, boolean>>({});
  const [concludeTried, setConcludeTried] = useState(false);
  const [showAll, setShowAll] = useState(() => TIPOS_ACTUACION.findIndex((t) => t.label === init.data.tipo) >= FIRST);
  const [dup, setDup] = useState<{ match: Actuacion; draft: boolean } | null>(null);
  const [ref, setRef] = useState('');
  const original = init.original;
  const isEdit = !!original;
  const code = a.codigo || peekCode('actuacion');

  const initialJSON = useRef(JSON.stringify(init.data));
  const touched = () => init.fromDraft || JSON.stringify(a) !== initialJSON.current;

  const sol = solicitante(a);
  const label = `${sol ? sol.nombre : 'Actuación nueva'}, ${fmtShort(todayISO())}`;
  const autosave = useAutosave('actuacion', init.editingId, step, a, label);
  const touchedRef = useRef(touched);
  touchedRef.current = touched;
  const saveIfTouched = () => touchedRef.current() && autosave.saveNow();

  // Guardar también al cambiar de paso (Flujo 2: la app puede cerrarse justo después).
  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    saveIfTouched();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Si se sale sin tocar nada, no se deja un "formulario sin terminar".
  useEffect(
    () => () => {
      if (!touchedRef.current()) {
        const d = getDB().drafts.actuacion;
        if (d && d.editingId === init.editingId && JSON.stringify(d.data) === initialJSON.current) setDraft('actuacion', null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const set = (patch: Partial<Actuacion>) => setA((p) => ({ ...p, ...patch }));
  const errs: Errs = shown[step] ? validateStep(a, step) : {};
  if (step === 3 && concludeTried && a.estado === 'Concluida' && !a.resultado.trim()) errs.resultado = MSG_CONCLUIR;
  const missing = missingActuacion(a);

  const mod = (k: (typeof FIELDS)[number]['key']) => !!original && fieldValue(a, k) !== fieldValue(original, k);
  const modCls = (k: (typeof FIELDS)[number]['key']) => (mod(k) ? 'modified' : undefined);

  const scrollToError = () => setTimeout(() => document.querySelector('.err')?.scrollIntoView({ block: 'center' }), 50);

  const goNext = () => {
    const e = validateStep(a, step);
    if (Object.keys(e).length) {
      setShown((s) => ({ ...s, [step]: true }));
      scrollToError();
      return;
    }
    setStep(step + 1);
    window.scrollTo(0, 0);
  };
  const goBack = () => {
    setStep(step - 1);
    window.scrollTo(0, 0);
  };

  const setEstado = (e: ActEstado) => {
    const patch: Partial<Actuacion> = { estado: e };
    if (e !== 'Pendiente' && !a.fechaAtencion) patch.fechaAtencion = todayISO();
    set(patch);
    setConcludeTried(e === 'Concluida' && !a.resultado.trim());
  };

  const trySave = (draft: boolean) => {
    if (!draft) {
      for (const s of [1, 2, 3]) {
        if (Object.keys(validateStep(a, s)).length) {
          setShown((x) => ({ ...x, [s]: true }));
          if (s === 3 && a.estado === 'Concluida') setConcludeTried(true);
          setStep(s);
          scrollToError();
          return;
        }
      }
    }
    const match = findDuplicateActuacion(getDB(), a);
    if (match) {
      setDup({ match, draft });
      return;
    }
    doSave();
  };

  const doSave = () => {
    const now = nowISO();
    if (isEdit) {
      const changed = FIELDS.filter((f) => mod(f.key)).map((f) => f.label);
      if (!changed.length) {
        autosave.clear();
        navigate(`/actuaciones/${original!.id}`);
        return;
      }
      const item = saveActuacion({
        ...a,
        historial: [...a.historial, { id: uid(), fecha: now, tipo: 'editado', texto: `Cambió: ${changed.join(', ')}`, origen: 'tableta' }],
      });
      autosave.clear();
      const n = changed.length;
      notify({
        tone: 'info',
        title: `Se ${n === 1 ? 'guardó 1 cambio' : `guardaron ${n} cambios`} en la tableta: ${changed.join(', ')}.`,
        text: 'Se enviará cuando haya Internet.',
        badge: 'local',
      });
      navigate(`/actuaciones/${item.id}`);
      return;
    }
    const codigo = a.codigo || nextCode('actuacion');
    const item = saveActuacion({
      ...a,
      codigo,
      createdAt: a.createdAt || now,
      historial: [...a.historial, { id: uid(), fecha: now, tipo: 'creado', texto: 'Registrado en la tableta', origen: 'tableta' }],
    });
    autosave.clear();
    notify({ tone: 'info', title: `Actuación ${codigo} guardada en la tableta`, text: 'Se enviará cuando haya Internet.', badge: 'local' });
    navigate(`/actuaciones/${item.id}`);
  };

  const addPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const dataUrl = await readPhoto(f);
    setA((p) => ({ ...p, documentos: [...p.documentos, { id: uid(), tipo: 'foto', texto: f.name || 'Foto', dataUrl }] }));
  };
  const addRef = () => {
    if (!ref.trim()) return;
    set({ documentos: [...a.documentos, { id: uid(), tipo: 'referencia', texto: ref.trim() }] });
    setRef('');
  };
  const removeDoc = (d: Evidence) => set({ documentos: a.documentos.filter((x) => x.id !== d.id) });

  const visibleTypes = showAll ? TIPOS_ACTUACION : TIPOS_ACTUACION.slice(0, FIRST);

  return (
    <div onBlur={saveIfTouched}>
      <div className="row act-head">
        <h1 style={{ margin: 0 }}>{isEdit ? 'Editar actuación' : 'Nueva actuación'}</h1>
        <span className="muted" data-testid="act-code">
          {code}
        </span>
        <span className="spacer" />
        <span data-testid="act-record">
          <RecordState missing={missing} />
        </span>
        <Mark n={43} />
      </div>

      <div className="act-stepper">
        <Stepper step={step} title={TITLES[step - 1]} />
        <Mark n={35} />
      </div>

      {step === 1 && (
        <div>
          <Field label="Tipo de actuación" error={errs.tipo} modified={mod('tipoFull')} mark={36}>
            <div className="choices act-types" role="group" aria-label="Tipo de actuación">
              {visibleTypes.map((t, i) => (
                <button
                  key={t.label}
                  type="button"
                  className="choice"
                  data-testid={`act-type-${i}`}
                  aria-pressed={a.tipo === t.label}
                  onClick={() => set({ tipo: t.label })}
                >
                  <strong>{t.label}</strong>
                  <span className="legal">{t.legal}</span>
                  {i === 0 && <Mark n={37} />}
                </button>
              ))}
            </div>
            {!showAll && (
              <div>
                <button type="button" className="btn" data-testid="more-types" onClick={() => setShowAll(true)}>
                  <Plus size={22} aria-hidden /> Ver más trámites
                </button>
              </div>
            )}
          </Field>
          {a.tipo === 'Otra' && (
            <Field label="¿Cuál trámite?" htmlFor="act-otro" cond="Se pide porque eligió Otra" error={errs.tipoOtro}>
              <input id="act-otro" value={a.tipoOtro} onChange={(e) => set({ tipoOtro: e.target.value })} className={modCls('tipoFull')} />
            </Field>
          )}
          <Field label="Asunto" htmlFor="act-asunto" error={errs.asunto} modified={mod('asunto')}>
            <textarea id="act-asunto" data-testid="act-asunto" value={a.asunto} onChange={(e) => set({ asunto: e.target.value })} className={modCls('asunto')} />
            <div className="row">
              <DictationHint />
              <Mark n={47} />
            </div>
          </Field>
          <Field label="Fecha de solicitud" htmlFor="act-fsol" error={errs.fechaSolicitud} modified={mod('fechaSolicitud')}>
            <input
              id="act-fsol"
              type="date"
              data-testid="act-fsol"
              max={todayISO()}
              value={a.fechaSolicitud}
              onChange={(e) => set({ fechaSolicitud: e.target.value })}
              className={`act-date ${modCls('fechaSolicitud') || ''}`}
            />
          </Field>
        </div>
      )}

      {step === 2 && (
        <div>
          {mod('participantes') && (
            <p>
              <span className="mod-tag">Modificado</span>
            </p>
          )}
          <PartyEditor
            parties={a.participantes}
            onChange={(p) => set({ participantes: p })}
            roles={['Solicitante', 'Declarante', 'Testigo']}
            roleLabel="Participación"
            showErrors={!!shown[2]}
            onBlurSave={saveIfTouched}
            markBase={38}
          />
          {errs.personas && (
            <div className="err" role="alert" style={{ marginTop: 12 }}>
              {errs.personas}
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div>
          <Field label="Estado de atención" modified={mod('estado')} mark={40}>
            <div className="seg act-states" role="group" aria-label="Estado de atención">
              {ACT_ESTADOS.map((s) => (
                <button key={s} type="button" aria-pressed={a.estado === s} data-testid={`act-state-${s}`} onClick={() => setEstado(s)}>
                  <span className="act-state-name">{s}</span>
                  <span className="act-state-help">{ACT_ESTADOS_AYUDA[s]}</span>
                </button>
              ))}
            </div>
          </Field>
          {a.estado !== 'Pendiente' && (
            <Field
              label="Fecha de atención"
              htmlFor="act-fat"
              cond="Se pide cuando el trámite está Atendido o Concluido"
              error={errs.fechaAtencion}
              modified={mod('fechaAtencion')}
              mark={41}
            >
              <input
                id="act-fat"
                type="date"
                data-testid="act-fat"
                min={a.fechaSolicitud || undefined}
                max={todayISO()}
                value={a.fechaAtencion}
                onChange={(e) => set({ fechaAtencion: e.target.value })}
                className={`act-date ${modCls('fechaAtencion') || ''}`}
              />
            </Field>
          )}
          {a.estado === 'Concluida' && (
            <>
              <Field label="Resultado" htmlFor="act-res" cond="Se pide cuando el trámite está Concluido" error={errs.resultado} modified={mod('resultado')} mark={42}>
                <textarea
                  id="act-res"
                  data-testid="act-resultado"
                  value={a.resultado}
                  onChange={(e) => set({ resultado: e.target.value })}
                  className={errs.resultado ? 'invalid' : modCls('resultado')}
                />
                <DictationHint />
              </Field>
              <Field label="Fecha de entrega" htmlFor="act-fent" cond="Se pide cuando el trámite está Concluido" error={errs.fechaEntrega} modified={mod('fechaEntrega')}>
                <input
                  id="act-fent"
                  type="date"
                  data-testid="act-fent"
                  min={a.fechaAtencion || a.fechaSolicitud || undefined}
                  value={a.fechaEntrega}
                  onChange={(e) => set({ fechaEntrega: e.target.value })}
                  className={`act-date ${errs.fechaEntrega ? 'invalid' : modCls('fechaEntrega') || ''}`}
                />
              </Field>
            </>
          )}
          <Field label="Observaciones" optional htmlFor="act-obs" modified={mod('observaciones')}>
            <textarea id="act-obs" value={a.observaciones} onChange={(e) => set({ observaciones: e.target.value })} className={modCls('observaciones')} />
          </Field>
          <Field label="Documentos" optional modified={mod('documentos')} mark={48}>
            <div className="row">
              <label className="btn" data-testid="act-photo">
                <Camera size={22} aria-hidden /> Tomar foto
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={addPhoto} />
              </label>
              <input
                aria-label="Referencia a documento físico"
                placeholder="Referencia a documento físico"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRef())}
                className="act-ref"
              />
              <button type="button" className="btn" onClick={addRef} disabled={!ref.trim()}>
                <Plus size={22} aria-hidden /> Agregar
              </button>
            </div>
            {!!a.documentos.length && (
              <div className="act-docs">
                {a.documentos.map((d) => (
                  <div key={d.id} className="act-doc">
                    {d.tipo === 'foto' && d.dataUrl ? <img src={d.dataUrl} alt={d.texto} /> : <span>{d.texto}</span>}
                    <button type="button" className="btn btn-ghost btn-icon" aria-label={`Quitar ${d.texto}`} onClick={() => removeDoc(d)}>
                      <Trash2 size={20} aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Field>
        </div>
      )}

      <ActionBar
        left={
          <>
            {step > 1 && (
              <button type="button" className="btn" data-testid="step-back" onClick={goBack}>
                <ArrowLeft size={22} aria-hidden /> Atrás
              </button>
            )}
            <span className="muted small" data-testid="autosave-status">
              {autosave.status}
            </span>
            {autosave.status && <Mark n={45} />}
          </>
        }
      >
        <Mark n={44} />
        <button type="button" className="btn" data-testid="save-draft" onClick={() => trySave(true)}>
          <Save size={22} aria-hidden /> Guardar como borrador
        </button>
        {step < 3 ? (
          <button type="button" className="btn btn-primary btn-lg" data-testid="step-next" onClick={goNext}>
            Siguiente <ArrowRight size={22} aria-hidden />
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-lg" data-testid="save-act" onClick={() => trySave(false)}>
            <Save size={22} aria-hidden /> Guardar
          </button>
        )}
      </ActionBar>

      {dup && (
        <Modal
          title="¿Es el mismo trámite?"
          onClose={() => setDup(null)}
          actions={
            <>
              <button type="button" className="btn" data-testid="dup-act-open" onClick={() => navigate(`/actuaciones/${dup.match.id}`)}>
                Es el mismo: ver el anterior
              </button>
              <button
                type="button"
                className="btn btn-primary"
                data-testid="dup-act-continue"
                onClick={() => {
                  setDup(null);
                  doSave();
                }}
              >
                Es otro trámite: guardar
              </button>
            </>
          }
        >
          <Mark n={46} />
          <p>Ya hay un trámite parecido en la tableta:</p>
          <div className="card" style={{ background: 'var(--amber-soft)' }}>
            <strong>
              {dup.match.codigo} · {tipoLabel(dup.match)}
            </strong>
            <div>
              {solicitante(dup.match)?.nombre} · {fmtDate(dup.match.fechaSolicitud)} · {dup.match.estado}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
