import { useState } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import type { DocTipo, Party } from '../lib/types';
import { COMUNIDADES, emptyParty, findDuplicatePerson, validateParty } from '../lib/domain';
import { getDB } from '../lib/store';
import { Field, Mark, Modal, Seg } from './ui';

const DOCS: DocTipo[] = ['DNI', 'Carné de extranjería', 'Otro', 'No tiene', 'No lo tiene a la mano'] as DocTipo[];

/**
 * Editor de partes (casos) o participantes (actuaciones). Compartido por P-03 y P-06.
 * Detecta duplicados (regla 5.3) al salir del nombre/DNI/comunidad: advierte, no bloquea.
 */
export function PartyEditor(props: {
  parties: Party[];
  onChange: (p: Party[]) => void;
  roles: Party['rol'][];
  roleLabel: string; // "Rol" | "Participación"
  showErrors: boolean;
  onBlurSave?: () => void;
  markBase?: number;
}) {
  const { parties, onChange, roles, roleLabel, showErrors } = props;
  const [dup, setDup] = useState<{ index: number; match: ReturnType<typeof findDuplicatePerson> } | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const update = (i: number, patch: Partial<Party>) => onChange(parties.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const checkDup = (i: number) => {
    props.onBlurSave?.();
    const p = parties[i];
    if (!p.nombre.trim() || dismissed.includes(p.id)) return;
    const m = findDuplicatePerson(getDB(), p, parties.map((x) => x.id));
    if (m) setDup({ index: i, match: m });
  };

  return (
    <div className="col">
      {parties.map((p, i) => {
        const e = showErrors ? validateParty(p) : {};
        const nid = `pn-${p.id}`;
        return (
          <section key={p.id} className="card" data-party={i + 1} aria-label={`Persona ${i + 1}`}>
            <div className="row" style={{ marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>Persona {i + 1}</h3>
              <span className="spacer" />
              {parties.length > 1 && (
                <button type="button" className="btn btn-ghost btn-danger" onClick={() => onChange(parties.filter((_, j) => j !== i))}>
                  <Trash2 size={20} aria-hidden /> Quitar
                </button>
              )}
            </div>
            <Field label={roleLabel} error={e.rol} mark={i === 0 ? props.markBase : undefined}>
              <Seg label={roleLabel} value={p.rol} options={roles} onChange={(v) => update(i, { rol: v })} />
            </Field>
            <div className="grid2">
              <Field label="Nombres y apellidos" htmlFor={nid} error={e.nombre}>
                <input id={nid} value={p.nombre} onChange={(ev) => update(i, { nombre: ev.target.value })} onBlur={() => checkDup(i)} autoComplete="off" />
              </Field>
              <Field label="Comunidad o localidad" htmlFor={`pc-${p.id}`} error={e.comunidad}>
                <input
                  id={`pc-${p.id}`}
                  list="comunidades"
                  value={p.comunidad}
                  onChange={(ev) => update(i, { comunidad: ev.target.value })}
                  onBlur={() => checkDup(i)}
                  autoComplete="off"
                />
              </Field>
            </div>
            <Field label="Documento" optional mark={i === 0 && props.markBase ? props.markBase + 1 : undefined}>
              <Seg label="Tipo de documento" value={p.docTipo} options={DOCS as Exclude<DocTipo, ''>[]} onChange={(v) => update(i, { docTipo: v, docNumero: v === 'No tiene' || v === 'No lo tiene a la mano' ? '' : p.docNumero })} />
            </Field>
            {(p.docTipo === 'DNI' || p.docTipo === 'Carné de extranjería' || p.docTipo === 'Otro') && (
              <Field label="Número de documento" htmlFor={`pd-${p.id}`} cond="Se pide porque eligió un tipo de documento" error={e.docNumero}>
                <input
                  id={`pd-${p.id}`}
                  inputMode="numeric"
                  value={p.docNumero}
                  onChange={(ev) => update(i, { docNumero: ev.target.value.replace(/\s/g, '') })}
                  onBlur={() => checkDup(i)}
                  maxLength={p.docTipo === 'DNI' ? 8 : 20}
                />
              </Field>
            )}
            <div className="grid2">
              <Field label="Teléfono o contacto" optional htmlFor={`pt-${p.id}`} error={e.telefono}>
                <div className="row" style={{ flexWrap: 'nowrap' }}>
                  <input
                    id={`pt-${p.id}`}
                    type="tel"
                    inputMode="numeric"
                    maxLength={9}
                    disabled={p.sinTelefono}
                    value={p.telefono}
                    onChange={(ev) => update(i, { telefono: ev.target.value.replace(/\D/g, '') })}
                    onBlur={props.onBlurSave}
                  />
                  <label className="check">
                    <input type="checkbox" checked={p.sinTelefono} onChange={(ev) => update(i, { sinTelefono: ev.target.checked, telefono: '' })} /> No tiene
                  </label>
                </div>
              </Field>
              <Field label="Dirección o referencia" optional htmlFor={`pa-${p.id}`}>
                <input id={`pa-${p.id}`} value={p.direccion} onChange={(ev) => update(i, { direccion: ev.target.value })} onBlur={props.onBlurSave} />
              </Field>
            </div>
          </section>
        );
      })}
      <datalist id="comunidades">
        {COMUNIDADES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <div>
        <button type="button" className="btn" onClick={() => onChange([...parties, emptyParty()])}>
          <UserPlus size={22} aria-hidden /> Agregar persona
        </button>
      </div>

      {dup && dup.match && (
        <Modal
          title="¿Es la misma persona?"
          onClose={() => setDup(null)}
          actions={
            <>
              <button
                className="btn"
                onClick={() => {
                  setDismissed([...dismissed, parties[dup.index].id]);
                  setDup(null);
                }}
              >
                Es otra persona: continuar
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const m = dup.match!.person;
                  const cur = parties[dup.index];
                  update(dup.index, { ...m, id: cur.id, rol: cur.rol });
                  setDismissed([...dismissed, cur.id]);
                  setDup(null);
                }}
              >
                Es la misma persona: usar sus datos
              </button>
            </>
          }
        >
          <p>Ya está registrada en {dup.match.where}:</p>
          <div className="card" style={{ background: 'var(--amber-soft)' }}>
            <strong>{dup.match.person.nombre}</strong>
            <div>
              {dup.match.person.docTipo === 'DNI' ? `DNI ${dup.match.person.docNumero}` : dup.match.person.docTipo || 'Sin documento'} · {dup.match.person.comunidad}
              {dup.match.person.telefono ? ` · ${dup.match.person.telefono}` : ''}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
