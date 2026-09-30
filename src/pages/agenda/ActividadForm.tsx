// OWNER: agente-agenda — P-08 Actividad: nueva o edición
import { MutableRefObject, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Save, X, XCircle } from 'lucide-react';
import type { Actividad, Categoria } from '../../lib/types';
import { getDB, nextCode, saveActividad, setDraft, uid, useDB } from '../../lib/store';
import { ACTIVIDAD_ESTADOS, CATEGORIAS, COMUNIDADES, missingActividad } from '../../lib/domain';
import { fmtShort, nowISO, todayISO } from '../../lib/dates';
import { back, navigate, useRoute } from '../../lib/router';
import { notify } from '../../lib/notices';
import { useAutosave } from '../../lib/autosave';
import { ActionBar, CAT_CLASS, CAT_ICON, DictationHint, Field, Mark, Modal, Seg } from '../../components/ui';
import { agendaHref } from './Agenda';
import { findOverlap } from './agendaUtils';

const TITULOS = ['Audiencia de conciliación', 'Reunión con autoridades comunales', ...COMUNIDADES.map((c) => `Visita a ${c}`)];
const OTRO = 'Otro lugar';
const RECORDATORIOS = ['No', 'El mismo día', '1 día antes'] as const;

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

function blank(fecha: string, casoId: string | null): Actividad {
  const db = getDB();
  const caso = casoId ? db.cases.find((c) => c.id === casoId) : undefined;
  return {
    id: uid(),
    codigo: '',
    titulo: '',
    categoria: '',
    fecha,
    horaInicio: '',
    horaFin: '',
    sinHora: false,
    lugar: '',
    descripcion: '',
    estado: 'Programada',
    vinculo: caso ? { tipo: 'caso', id: caso.id } : null,
    creadaDesdeCaso: caso ? caso.id : null,
    recordatorio: '1 día antes',
    personas: caso ? caso.partes.map((p) => p.nombre) : [],
    historial: [],
    sync: 'local',
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
}

type Ctl = { save: () => void; clear: () => void };
/** Se monta solo cuando la jueza cambió algo: así abrir y salir no deja un borrador vacío. */
function Autosave({ data, editingId, label, ctl }: { data: Actividad; editingId: string | null; label: string; ctl: MutableRefObject<Ctl | null> }) {
  const s = useAutosave('actividad', editingId, 1, data, label);
  ctl.current = { save: s.saveNow, clear: s.clear };
  return (
    <span className="muted small" data-testid="autosave-status">
      {s.status}
    </span>
  );
}

export default function ActividadForm({ id }: { id?: string }) {
  const db = useDB();
  const { query } = useRoute();
  const today = todayISO();
  const editingId = id ?? null;

  const [a, setA] = useState<Actividad | null>(() => {
    const d = getDB();
    const draft = d.drafts.actividad;
    if (query.get('continuar') === '1' && draft && draft.editingId === editingId) return draft.data as Actividad;
    if (id) return d.actividades.find((x) => x.id === id) ?? null;
    const f = query.get('fecha');
    return blank(f && /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : today, query.get('caso'));
  });
  const [otro, setOtro] = useState(() => !!a?.lugar && !COMUNIDADES.includes(a.lugar));
  const [changed, setChanged] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [ask, setAsk] = useState<null | { kind: 'missing'; missing: string[] } | { kind: 'overlap'; titulo: string; draftOk: boolean } | { kind: 'exit' }>(null);
  const [vq, setVq] = useState('');
  const ctl = useRef<Ctl | null>(null);
  const horaRef = useRef<HTMLInputElement>(null);

  if (!a) return <p>No se encontró la actividad.</p>;

  const set = (patch: Partial<Actividad>) => {
    setA({ ...a, ...patch });
    setChanged(true);
  };
  const touch = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const show = (k: string) => submitted || touched[k];

  const errors: Record<string, string> = {};
  if (!a.titulo.trim()) errors.titulo = 'Escriba un nombre para la actividad.';
  if (!a.categoria) errors.categoria = 'Elija el tipo de actividad.';
  if (!a.fecha) errors.fecha = 'Elija la fecha.';
  if (!a.lugar.trim()) errors.lugar = 'Indique dónde será.';
  const badTime = !a.sinHora && !!a.horaInicio && !!a.horaFin && a.horaFin <= a.horaInicio;
  if (badTime) errors.horaFin = 'La hora de término debe ser después de la de inicio.';

  const pastWarn = !!a.fecha && a.fecha < today && a.estado === 'Programada';
  const doneWarn = a.estado === 'Realizada' && a.fecha > today;

  // Vínculo con caso o trámite
  const vinc = a.vinculo
    ? a.vinculo.tipo === 'caso'
      ? db.cases.find((c) => c.id === a.vinculo!.id)
      : db.actuaciones.find((c) => c.id === a.vinculo!.id)
    : undefined;
  const vincLabel = vinc && a.vinculo ? `${a.vinculo.tipo === 'caso' ? 'Caso' : 'Trámite'} ${vinc.codigo}` : '';
  const vres = vq.trim()
    ? [
        ...db.cases.map((c) => ({ tipo: 'caso' as const, id: c.id, codigo: c.codigo, names: c.partes.map((p) => p.nombre), label: `Caso ${c.codigo}` })),
        ...db.actuaciones.map((t) => ({ tipo: 'actuacion' as const, id: t.id, codigo: t.codigo, names: t.participantes.map((p) => p.nombre), label: `Trámite ${t.codigo}` })),
      ]
        .filter((x) => [x.codigo, ...x.names].some((s) => norm(s).includes(norm(vq.trim()))))
        .slice(0, 5)
    : [];

  function commit() {
    const isNew = !a!.codigo;
    const codigo = a!.codigo || nextCode('actividad');
    const item: Actividad = {
      ...a!,
      codigo,
      horaInicio: a!.sinHora ? '' : a!.horaInicio,
      horaFin: a!.sinHora ? '' : a!.horaFin,
      historial: [...a!.historial, { id: uid(), fecha: nowISO(), tipo: isNew ? 'creado' : 'editado', texto: isNew ? 'Registrada en la tableta' : 'Editada en la tableta', origen: 'tableta' }],
    };
    saveActividad(item);
    ctl.current?.clear();
    setDraft('actividad', null);
    notify({ tone: 'info', title: 'Actividad guardada en la tableta', text: 'Se enviará cuando haya Internet.', badge: 'local' });
    navigate(agendaHref('dia', item.fecha || today));
  }

  function save(opts: { draftOk?: boolean; overlapOk?: boolean } = {}) {
    setSubmitted(true);
    setAsk(null);
    if (badTime) return;
    const missing = missingActividad(a!);
    if (missing.length && !opts.draftOk) return setAsk({ kind: 'missing', missing });
    const o = opts.overlapOk ? null : findOverlap(getDB(), a!);
    if (o) return setAsk({ kind: 'overlap', titulo: o.titulo, draftOk: !!opts.draftOk });
    commit();
  }

  const lugarSel = COMUNIDADES.includes(a.lugar) ? a.lugar : otro ? OTRO : '';

  return (
    <div className="ag-form" onBlur={() => ctl.current?.save()}>
      <h1>{editingId ? 'Editar actividad' : 'Nueva actividad'}</h1>
      <div className="grid2">
        <div>
          <Field label="Título" htmlFor="ag-titulo" error={show('titulo') ? errors.titulo : undefined} mark={63}>
            <datalist id="ag-titulos">
              {TITULOS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <input
              id="ag-titulo"
              type="text"
              list="ag-titulos"
              autoComplete="off"
              data-testid="activity-title"
              className={show('titulo') && errors.titulo ? 'invalid' : ''}
              value={a.titulo}
              onChange={(e) => set({ titulo: e.target.value })}
              onBlur={touch('titulo')}
            />
          </Field>

          <Field label="Tipo de actividad" error={show('categoria') ? errors.categoria : undefined} mark={64}>
            <Seg<Categoria>
              label="Tipo de actividad"
              value={a.categoria}
              options={CATEGORIAS}
              onChange={(v) => set({ categoria: v })}
              icons={Object.fromEntries(
                CATEGORIAS.map((c) => {
                  const Icon = CAT_ICON[c];
                  return [c, <Icon key={c} size={22} aria-hidden color={`var(--cat-${CAT_CLASS[c]})`} />];
                }),
              )}
            />
          </Field>

          <Field label="Fecha" htmlFor="ag-fecha" error={show('fecha') ? errors.fecha : undefined}>
            <input id="ag-fecha" type="date" className="ag-date" data-testid="activity-date" value={a.fecha} onChange={(e) => set({ fecha: e.target.value })} onBlur={touch('fecha')} />
            {pastWarn && (
              <div className="ag-warn" role="status">
                <AlertTriangle size={18} aria-hidden /> Está agendando en una fecha que ya pasó. ¿Es correcto?
              </div>
            )}
          </Field>

          <div className="row ag-times">
            <Field label="Hora de inicio" optional htmlFor="ag-hi">
              <input
                id="ag-hi"
                ref={horaRef}
                type="time"
                data-testid="activity-start"
                disabled={a.sinHora}
                value={a.sinHora ? '' : a.horaInicio}
                onChange={(e) => set({ horaInicio: e.target.value })}
              />
            </Field>
            {!a.sinHora && (
              <Field label="Hora de término" htmlFor="ag-hf" cond="Se pide cuando hay hora de inicio" error={errors.horaFin}>
                <input
                  id="ag-hf"
                  type="time"
                  data-testid="activity-end"
                  className={errors.horaFin ? 'invalid' : ''}
                  disabled={!a.horaInicio}
                  value={a.horaFin}
                  onChange={(e) => set({ horaFin: e.target.value })}
                />
              </Field>
            )}
          </div>
          <label className="check ag-nohour">
            <input type="checkbox" data-testid="activity-nohour" checked={a.sinHora} onChange={(e) => set({ sinHora: e.target.checked })} />
            Sin hora fija
          </label>

          <Field label="Lugar o comunidad" error={show('lugar') ? errors.lugar : undefined}>
            <Seg
              label="Lugar o comunidad"
              value={lugarSel}
              options={[...COMUNIDADES, OTRO]}
              onChange={(v) => {
                if (v === OTRO) {
                  setOtro(true);
                  set({ lugar: '' });
                } else {
                  setOtro(false);
                  set({ lugar: v });
                }
                setTouched((t) => ({ ...t, lugar: true }));
              }}
            />
            {otro && (
              <input type="text" aria-label="Otro lugar" data-testid="activity-place-other" value={a.lugar} onChange={(e) => set({ lugar: e.target.value })} />
            )}
          </Field>
        </div>

        <div>
          <Field label="Estado" mark={65}>
            <Seg
              label="Estado"
              value={a.estado}
              options={ACTIVIDAD_ESTADOS}
              onChange={(v) => set({ estado: v })}
              icons={{ Programada: <Clock size={20} aria-hidden />, Realizada: <CheckCircle size={20} aria-hidden />, Cancelada: <XCircle size={20} aria-hidden /> }}
            />
            {doneWarn && (
              <div className="ag-warn" role="status">
                <AlertTriangle size={18} aria-hidden /> Marcó como realizada una actividad que aún no ocurre. ¿Es correcto?
              </div>
            )}
          </Field>

          <Field label="Descripción o motivo" optional htmlFor="ag-desc">
            <textarea id="ag-desc" value={a.descripcion} onChange={(e) => set({ descripcion: e.target.value })} />
            <DictationHint />
          </Field>

          <Field label="Vínculo con caso o trámite" optional htmlFor="ag-vinc" mark={66}>
            {a.vinculo ? (
              <div className="row">
                <strong data-testid="activity-link">{vincLabel}</strong>
                <button
                  type="button"
                  className="btn"
                  onClick={() => set({ vinculo: null, creadaDesdeCaso: null, personas: [] })}
                >
                  <X size={20} aria-hidden /> Quitar
                </button>
              </div>
            ) : (
              <>
                <input
                  id="ag-vinc"
                  type="search"
                  placeholder="Código o nombre"
                  data-testid="activity-link-search"
                  value={vq}
                  onChange={(e) => setVq(e.target.value)}
                />
                <div className="list">
                  {vres.map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      className="item ag-vres"
                      onClick={() => {
                        set({ vinculo: { tipo: x.tipo, id: x.id }, personas: x.names });
                        setVq('');
                      }}
                    >
                      <div className="grow">
                        <div className="title">{x.label}</div>
                        <div className="sub">{x.names.join(' · ')}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </Field>

          <Field label="Recordatorio" optional mark={67}>
            <Seg label="Recordatorio" value={a.recordatorio} options={RECORDATORIOS} onChange={(v) => set({ recordatorio: v })} />
          </Field>
        </div>
      </div>

      <ActionBar
        left={
          <>
            <button className="btn" onClick={() => (changed ? setAsk({ kind: 'exit' }) : back())}>
              Cancelar
            </button>
            {changed && <Autosave data={a} editingId={editingId} label={`${a.titulo.trim() || 'Actividad'}, ${fmtShort(a.fecha || today)}`} ctl={ctl} />}
          </>
        }
      >
        <button className="btn btn-primary btn-lg" data-testid="save-activity" onClick={() => save()}>
          <Save size={24} aria-hidden /> Guardar actividad
        </button>
        <Mark n={69} />
      </ActionBar>

      {ask?.kind === 'missing' && (
        <Modal
          title="Faltan datos"
          onClose={() => setAsk(null)}
          actions={
            <>
              <button className="btn" data-testid="draft-save" onClick={() => save({ draftOk: true })}>
                Guardar como borrador
              </button>
              <button className="btn btn-primary" data-testid="draft-complete" onClick={() => setAsk(null)}>
                Completar ahora
              </button>
            </>
          }
        >
          Falta: {ask.missing.join(', ')}.
        </Modal>
      )}
      {ask?.kind === 'overlap' && (
        <Modal
          title="Cruce de horario"
          onClose={() => setAsk(null)}
          actions={
            <>
              <button
                className="btn"
                data-testid="overlap-change"
                onClick={() => {
                  setAsk(null);
                  setTimeout(() => horaRef.current?.focus(), 0);
                }}
              >
                Cambiar la hora
              </button>
              <button className="btn btn-primary" data-testid="overlap-accept" onClick={() => save({ draftOk: ask.draftOk, overlapOk: true })}>
                Agendar igual
              </button>
            </>
          }
        >
          <p data-testid="overlap-text">
            A esa hora ya tiene: {ask.titulo}. ¿Agendar igual?
            <Mark n={68} />
          </p>
        </Modal>
      )}
      {ask?.kind === 'exit' && (
        <Modal
          title="¿Salir sin guardar?"
          onClose={() => setAsk(null)}
          actions={
            <>
              <button className="btn" onClick={() => setAsk(null)}>
                Seguir editando
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  ctl.current?.clear();
                  setDraft('actividad', null);
                  back();
                }}
              >
                Salir sin guardar
              </button>
            </>
          }
        />
      )}
    </div>
  );
}
