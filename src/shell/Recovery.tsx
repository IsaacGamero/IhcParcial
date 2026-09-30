// OWNER: agente-envio — Recuperación de un formulario sin terminar (3.5)
import { useState } from 'react';
import type { FormDraft, Kind } from '../lib/types';
import { setDraft } from '../lib/store';
import { navigate } from '../lib/router';
import { draftRoute } from '../lib/sync';
import { Mark, Modal } from '../components/ui';

const KIND_TXT: Record<Kind, string> = { caso: 'un caso', actuacion: 'una actuación', actividad: 'una actividad' };

export function latestDraft(drafts: Partial<Record<Kind, FormDraft>>): FormDraft | null {
  const list = Object.values(drafts).filter(Boolean) as FormDraft[];
  if (!list.length) return null;
  return list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0];
}

export function Recovery({ draft, onDone }: { draft: FormDraft; onDone: () => void }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm)
    return (
      <Modal
        title="¿Descartar lo que escribió? No se podrá recuperar."
        actions={
          <>
            <Mark n={77} />
            <button className="btn btn-lg" onClick={() => setConfirm(false)}>
              No, volver
            </button>
            <button
              className="btn btn-danger btn-lg"
              data-testid="confirm-discard"
              onClick={() => {
                setDraft(draft.kind, null);
                onDone();
              }}
            >
              Sí, descartar
            </button>
          </>
        }
      />
    );
  return (
    <Modal
      title={`Tenía ${KIND_TXT[draft.kind]} sin terminar${draft.label ? ` (${draft.label})` : ''}. ¿Desea continuar?`}
      actions={
        <>
          <Mark n={76} />
          <button className="btn btn-lg" data-testid="recover-discard" onClick={() => setConfirm(true)}>
            Descartar
          </button>
          <button
            className="btn btn-primary btn-lg"
            data-testid="recover-continue"
            onClick={() => {
              onDone();
              navigate(draftRoute(draft));
            }}
          >
            Continuar
          </button>
        </>
      }
    />
  );
}
