// Envío al Poder Judicial (simulado, P-09). OWNER: agente-envio.
// Capa "api" falsa SIN aleatoriedad: el resultado depende de ?scenario= y la latencia de ?latency= (ms por registro).
import type { Actividad, Actuacion, Caso, ConflictInfo, DB, FormDraft, HistoryEntry, Kind, SyncItemResult, SyncRun } from './types';
import { getDB, pendingRecords, setDB, uid, type PendingRecord } from './store';
import { params } from './params';
import { isOnline } from './connectivity';
import { fmtShort, nowISO } from './dates';
import { navigate } from './router';

type Rec = Caso | Actuacion | Actividad;
const LIST = { caso: 'cases', actuacion: 'actuaciones', actividad: 'actividades' } as const;
export const FIELD_LABEL: Record<string, string> = { observaciones: 'Observaciones', estado: 'Estado', descripcion: 'Descripción' };
/** Campo que se usa para simular el conflicto si no hay ediciones reales desde la computadora. */
const conflictField = (k: Kind) => (k === 'actividad' ? 'descripcion' : 'observaciones');
const PC_SAMPLE = 'Las partes pidieron cambiar la fecha de la audiencia.';

const list = (d: DB, k: Kind) => d[LIST[k]] as Rec[];
const srvList = (d: DB, k: Kind) => d.server[LIST[k]] as Rec[];
function upsert(arr: Rec[], item: Rec): Rec[] {
  const i = arr.findIndex((x) => x.id === item.id);
  if (i === -1) return [item, ...arr];
  const c = arr.slice();
  c[i] = item;
  return c;
}
function putTablet(d: DB, k: Kind, item: Rec): DB {
  return { ...d, [LIST[k]]: upsert(list(d, k), item) } as DB;
}
function putServer(d: DB, k: Kind, item: Rec): DB {
  return { ...d, server: { ...d.server, [LIST[k]]: upsert(srvList(d, k), item) } } as DB;
}
const val = (r: Rec, f: string) => String((r as unknown as Record<string, unknown>)[f] ?? '');

/** Nombre legible del registro para la lista de envío. */
export function recordLabel(d: DB, p: { kind: Kind; id: string }): string {
  const r = list(d, p.kind).find((x) => x.id === p.id);
  if (!r) return '';
  if (p.kind === 'caso') {
    const c = r as Caso;
    return `Caso · ${c.partes[0]?.nombre || c.tipo || 'sin nombre'}`;
  }
  if (p.kind === 'actuacion') {
    const a = r as Actuacion;
    return `Trámite · ${a.participantes[0]?.nombre || a.tipo || 'sin nombre'}`;
  }
  return `Actividad · ${(r as Actividad).titulo || 'sin título'}`;
}

let running = false;
export const isSyncRunning = () => running;

// Si la aplicación se cerró a mitad de un envío, se olvida la corrida (los registros conservan su estado real).
if (getDB().syncRun?.status === 'running') setDB((d) => ({ ...d, syncRun: null }));

function patchRun(fn: (r: SyncRun) => SyncRun) {
  setDB((d) => (d.syncRun ? { ...d, syncRun: fn(d.syncRun) } : d));
}
function setItem(i: number, status: SyncItemResult['status']) {
  patchRun((r) => ({ ...r, items: r.items.map((it, j) => (j === i ? { ...it, status } : it)) }));
}

/** Envía un registro: copia al Poder Judicial y resuelve conflictos con la versión más reciente (computadora). */
function sendOne(i: number, synth: PendingRecord | null) {
  setDB((d) => {
    const run = d.syncRun!;
    const it = run.items[i];
    const rec = list(d, it.kind).find((x) => x.id === it.id);
    let next: DB = d;
    let conflict: ConflictInfo | null = null;
    let pcEdits = d.server.pcEdits;
    if (rec) {
      let upd: Rec = { ...rec, sync: 'sent' };
      const edits = pcEdits.filter((e) => e.kind === it.kind && e.id === it.id);
      if (!edits.length && synth && synth.id === it.id) {
        const f = conflictField(it.kind);
        edits.push({ kind: it.kind, id: it.id, field: f, value: val(rec, f) === PC_SAMPLE ? PC_SAMPLE + ' ' : PC_SAMPLE, at: nowISO() });
      }
      const hist: HistoryEntry[] = [];
      for (const e of edits) {
        const tab = val(rec, e.field);
        (upd as unknown as Record<string, unknown>)[e.field] = e.value;
        if (tab === e.value) continue;
        const label = FIELD_LABEL[e.field] || e.field;
        conflict = conflict || { kind: it.kind, id: it.id, codigo: it.codigo, fields: [] };
        conflict.fields.push({ field: e.field, label, tablet: tab, pc: e.value, used: 'pc', pcDate: e.at });
        hist.push({
          id: uid(),
          fecha: nowISO(),
          tipo: 'conflicto',
          texto: `Se usó la versión de la computadora del ${fmtShort(e.at)} en: ${label}.`,
          descartado: { [e.field]: tab },
          origen: 'computadora',
        });
      }
      pcEdits = pcEdits.filter((e) => !(e.kind === it.kind && e.id === it.id));
      upd = { ...upd, historial: [...hist, ...upd.historial] } as Rec;
      next = putTablet(next, it.kind, upd);
      next = putServer(next, it.kind, upd);
      next = { ...next, server: { ...next.server, pcEdits } };
    }
    const c = conflict as ConflictInfo | null;
    return {
      ...next,
      syncRun: {
        ...run,
        done: run.done + 1,
        items: run.items.map((x, j) => (j === i ? { ...x, status: c ? 'conflict' : 'sent' } : x)),
        conflicts: c ? [...run.conflicts, c] : run.conflicts,
      },
    };
  });
}

function finish(sent: number, cut: boolean) {
  running = false;
  setDB((d) => {
    const run = d.syncRun!;
    const items = run.items.map((it) => (it.status === 'sent' || it.status === 'conflict' ? it : { ...it, status: 'failed' as const }));
    let status: SyncRun['status'];
    if (sent === run.total) status = run.conflicts.length ? 'conflict' : 'ok';
    else if (sent === 0 && !cut) status = 'error';
    else status = 'partial';
    let next: DB = { ...d, syncRun: { ...run, items, status, finishedAt: nowISO() } };
    if (sent > 0) {
      const at = nowISO();
      next = { ...next, meta: { ...next.meta, lastSentAt: at }, server: { ...next.server, lastTabletSendAt: at } };
      // Lo editado en la computadora sobre registros ya enviados baja a la tableta.
      const failed = new Set(items.filter((x) => x.status === 'failed').map((x) => x.id));
      const keep: DB['server']['pcEdits'] = [];
      for (const e of next.server.pcEdits) {
        const rec = list(next, e.kind).find((x) => x.id === e.id);
        if (!rec || failed.has(e.id) || rec.sync !== 'sent') {
          keep.push(e);
          continue;
        }
        const upd = { ...rec, [e.field]: e.value } as Rec;
        upd.historial = [
          { id: uid(), fecha: e.at, tipo: 'editado', texto: `Cambiado desde la computadora: ${FIELD_LABEL[e.field] || e.field}.`, origen: 'computadora' },
          ...rec.historial,
        ];
        next = putTablet(next, e.kind, upd);
      }
      next = { ...next, server: { ...next.server, pcEdits: keep } };
    }
    return next;
  });
}

/**
 * Inicia el envío de los registros por enviar (pendingRecords) y actualiza db.syncRun.
 * go=false: no abre la pantalla de envío (envío automático mientras la jueza llena un formulario).
 */
export function startSync(opts: { go?: boolean } = {}): void {
  if (opts.go !== false) navigate('/envio');
  if (running || !isOnline()) return;
  const d0 = getDB();
  const pend = pendingRecords(d0);
  if (!pend.length) return;
  running = true;
  const total = pend.length;
  const items: SyncItemResult[] = pend.map((p) => ({ kind: p.kind, id: p.id, codigo: p.codigo, label: recordLabel(d0, p), status: 'waiting' }));
  setDB((d) => ({ ...d, syncRun: { status: 'running', total, done: 0, items, startedAt: nowISO(), finishedAt: null, conflicts: [] } }));

  const sc = params.scenario;
  const okCount = sc === 'sync-error' ? 0 : sc === 'sync-partial' ? (total > 1 ? Math.floor(total / 2) : 0) : total;
  let synth: PendingRecord | null = null;
  if (sc === 'conflict') {
    const edited = pend.find((p) => d0.server.pcEdits.some((e) => e.kind === p.kind && e.id === p.id));
    // Conflicto simulado una sola vez por registro (si ya tuvo uno, se respeta lo que eligió la jueza).
    const fresh = pend.filter((p) => !list(d0, p.kind).find((x) => x.id === p.id)?.historial.some((h) => h.tipo === 'conflicto'));
    synth = edited ? null : fresh.find((p) => p.kind === 'caso') || fresh[0] || null;
  }
  const latency = Math.max(0, params.latency);
  let i = 0;
  const tick = () => {
    if (i >= total) return finish(i, false);
    // freeze=1: la barra se detiene en 50 % (capturas).
    if (params.freeze && total > 1 && i >= Math.floor(total / 2)) return;
    setItem(i, 'sending');
    setTimeout(() => {
      if (!isOnline()) return finish(i, true);
      if (i >= okCount) return finish(i, sc === 'sync-partial');
      sendOne(i, synth);
      i++;
      tick();
    }, latency);
  };
  tick();
}

/** [Ver y cambiar]: elegir otra versión de un campo en conflicto. La versión reemplazada va al historial. */
export function chooseVersions(c: ConflictInfo, choice: Record<string, 'tablet' | 'pc'>) {
  const changed = c.fields.filter((f) => choice[f.field] && choice[f.field] !== f.used);
  if (!changed.length) return;
  setDB((d) => {
    const rec = list(d, c.kind).find((x) => x.id === c.id);
    if (!rec) return d;
    const upd = { ...rec, sync: 'local', updatedAt: nowISO() } as Rec;
    const hist: HistoryEntry[] = [];
    for (const f of changed) {
      const useTab = choice[f.field] === 'tablet';
      (upd as unknown as Record<string, unknown>)[f.field] = useTab ? f.tablet : f.pc;
      hist.push({
        id: uid(),
        fecha: nowISO(),
        tipo: 'conflicto',
        texto: `Se usó la versión de la ${useTab ? 'tableta' : 'computadora'} en: ${f.label}.`,
        descartado: { [f.field]: useTab ? f.pc : f.tablet },
        origen: useTab ? 'tableta' : 'computadora',
      });
    }
    upd.historial = [...hist, ...rec.historial];
    const run = d.syncRun;
    const conflicts = run
      ? run.conflicts.map((x) => (x.id === c.id && x.kind === c.kind ? { ...x, fields: x.fields.map((f) => ({ ...f, used: choice[f.field] || f.used })) } : x))
      : [];
    return { ...putTablet(d, c.kind, upd), syncRun: run ? { ...run, conflicts } : run };
  });
  startSync({ go: false });
}

/** Ruta para continuar un formulario sin terminar (3.5). */
export function draftRoute(dr: FormDraft): string {
  const base = dr.kind === 'caso' ? '/casos' : dr.kind === 'actuacion' ? '/actuaciones' : '/agenda';
  const nuevo = dr.kind === 'caso' ? 'nuevo' : 'nueva';
  return `${base}/${dr.editingId ? `${dr.editingId}/editar` : nuevo}?continuar=1`;
}
