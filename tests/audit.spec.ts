// Evidencia automática de factores humanos (sección 9): objetivos táctiles y contraste.
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fillParty, party, stable, url } from './helpers';

const MIN = 48;
const GAP = 8;

interface Screen {
  id: string;
  name: string;
  hash?: string;
  query?: string;
  pin?: boolean;
  viewport?: { width: number; height: number };
  setup?: (page: Page) => Promise<void>;
}

const caseId = async (page: Page, code: string) =>
  page.evaluate((c) => JSON.parse(localStorage.getItem('jc-db-v1')!).cases.find((x: { codigo: string }) => x.codigo === c).id, code);
const actividadId = async (page: Page, title: string) =>
  page.evaluate((t) => JSON.parse(localStorage.getItem('jc-db-v1')!).actividades.find((x: { titulo: string }) => x.titulo === t).id, title);

const SCREENS: Screen[] = [
  { id: 'P-00', name: 'PIN', pin: true },
  { id: 'P-00', name: '¿Olvidó su PIN?', pin: true, setup: async (p) => p.getByTestId('pin-forgot').click() },
  { id: 'P-00b', name: 'Introducción', hash: '/intro' },
  { id: 'P-00b', name: 'Ayuda', hash: '/ayuda' },
  { id: 'P-01', name: 'Inicio (pendientes, recordatorio, batería 15 %)', query: 'seed=mixed&battery=15' },
  { id: 'P-01', name: 'Inicio con borrador sin terminar', setup: async (p) => {
      await p.goto(url({ reset: false, hash: '/casos/nuevo' }));
      await p.getByTestId('case-description').fill('Prueba');
      await p.getByTestId('case-description').blur();
      await p.goto(url({ reset: false, hash: '/' }));
      await p.getByTestId('draft-continue').waitFor();
    } },
  { id: 'P-01', name: 'Recuperación de borrador (ventana)', setup: async (p) => {
      await p.goto(url({ reset: false, hash: '/casos/nuevo' }));
      await p.getByTestId('case-description').fill('Prueba');
      await p.getByTestId('case-description').blur();
      await p.reload();
      await p.getByTestId('recover-continue').waitFor();
    } },
  { id: 'P-02', name: 'Casos: lista', hash: '/casos', setup: async (p) => {
      await p.getByTestId('case-search').fill('a');
      await p.getByTestId('filter-comunidad').click();
    } },
  { id: 'P-02', name: 'Casos: filtro de fechas', hash: '/casos', setup: async (p) => p.getByTestId('filter-fechas').click() },
  { id: 'P-03', name: 'Caso nuevo · Paso 1', hash: '/casos/nuevo', setup: async (p) => {
      await p.getByRole('button', { name: /^Otro/ }).click();
      await p.getByRole('group', { name: 'Estado' }).getByRole('button', { name: 'Concluido' }).click();
      await p.getByTestId('step-next').click();
    } },
  { id: 'P-03', name: 'Caso nuevo · Paso 2', hash: '/casos/nuevo', setup: async (p) => {
      await p.getByRole('button', { name: /^Deudas/ }).click();
      await p.getByTestId('case-description').fill('x');
      await p.getByTestId('step-next').click();
      await fillParty(party(p, 1), { doc: 'DNI' });
      await p.getByTestId('step-next').click();
    } },
  { id: 'P-03', name: 'Caso nuevo · Duplicado', hash: '/casos/nuevo', setup: async (p) => {
      await p.getByRole('button', { name: /^Deudas/ }).click();
      await p.getByTestId('case-description').fill('x');
      await p.getByTestId('step-next').click();
      await fillParty(party(p, 1), { nombre: 'María Condori Huamán' });
      await p.getByRole('dialog', { name: '¿Es la misma persona?' }).waitFor();
    } },
  { id: 'P-03', name: 'Caso nuevo · Paso 3', hash: '/casos/nuevo', setup: async (p) => {
      await p.getByRole('button', { name: /^Deudas/ }).click();
      await p.getByTestId('case-description').fill('x');
      await p.getByTestId('step-next').click();
      await fillParty(party(p, 1), { rol: 'Solicitante', nombre: 'Ana Tito Ruiz', comunidad: 'San Pedro' });
      await fillParty(party(p, 2), { rol: 'Invitado', nombre: 'Luis Poma Rey', comunidad: 'San Pedro' });
      await p.getByTestId('step-next').click();
      await p.getByTestId('next-date').fill('2026-05-19');
    } },
  { id: 'P-03', name: 'Caso: edición con Modificado', setup: async (p) => {
      const id = await caseId(p, 'JZ04-TAB01-202604-0007');
      await p.goto(url({ reset: false, hash: `/casos/${id}/editar` }));
      await p.getByTestId('case-observaciones').fill('Cambio');
    } },
  { id: 'P-04', name: 'Caso: detalle', setup: async (p) => {
      const id = await caseId(p, 'JZ04-TAB01-202604-0005');
      await p.goto(url({ reset: false, hash: `/casos/${id}` }));
      await p.getByTestId('register-advance').waitFor();
    } },
  { id: 'P-04', name: 'Caso: registrar avance', setup: async (p) => {
      const id = await caseId(p, 'JZ04-TAB01-202604-0007');
      await p.goto(url({ reset: false, hash: `/casos/${id}` }));
      await p.getByTestId('register-advance').click();
      const d = p.getByRole('dialog', { name: 'Registrar avance' });
      await d.getByRole('button', { name: 'Concluido' }).click();
      await d.getByTestId('advance-save').click();
      await d.getByTestId('photo-input').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64') });
      await d.locator('.casos-thumb').waitFor();
    } },
  { id: 'P-05', name: 'Actuaciones: lista', hash: '/actuaciones' },
  { id: 'P-06', name: 'Actuación nueva · Paso 1', hash: '/actuaciones/nueva', setup: async (p) => {
      await p.getByTestId('more-types').click();
      await p.getByRole('button', { name: /^Otra/ }).click();
      await p.getByTestId('step-next').click();
    } },
  { id: 'P-06', name: 'Actuación nueva · Paso 2', hash: '/actuaciones/nueva', setup: async (p) => {
      await p.getByTestId('act-type-0').click();
      await p.getByTestId('act-asunto').fill('x');
      await p.getByTestId('step-next').click();
      await p.getByTestId('step-next').click();
    } },
  { id: 'P-06', name: 'Actuación nueva · Paso 3 (Concluida)', hash: '/actuaciones/nueva', setup: async (p) => {
      await p.getByTestId('act-type-0').click();
      await p.getByTestId('act-asunto').fill('x');
      await p.getByTestId('step-next').click();
      await fillParty(party(p, 1), { nombre: 'Ana Tito Ruiz', comunidad: 'San Pedro' });
      await p.getByTestId('step-next').click();
      await p.getByTestId('act-state-Concluida').click();
      await p.getByTestId('act-photo').locator('input').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64') });
      await p.locator('.act-doc').waitFor();
    } },
  { id: 'P-06', name: 'Actuación: detalle', setup: async (p) => {
      await p.goto(url({ reset: false, hash: '/actuaciones' }));
      await p.getByTestId('act-row').first().click();
      await p.getByTestId('edit-act').waitFor();
    } },
  { id: 'P-07', name: 'Agenda: Semana', hash: '/agenda?vista=semana&fecha=2026-05-12' },
  { id: 'P-07', name: 'Agenda: Mes', hash: '/agenda?vista=mes&fecha=2026-05-12' },
  { id: 'P-07', name: 'Agenda: Día', hash: '/agenda?vista=dia&fecha=2026-05-13' },
  { id: 'P-07', name: 'Agenda: búsqueda', hash: '/agenda', setup: async (p) => p.getByTestId('agenda-search').fill('Huayllay') },
  { id: 'P-08', name: 'Actividad nueva', hash: '/agenda/nueva', setup: async (p) => {
      await p.getByRole('group', { name: 'Lugar o comunidad' }).getByRole('button', { name: 'Otro lugar' }).click();
      await p.getByTestId('activity-link-search').fill('Quispe');
    } },
  { id: 'P-08', name: 'Actividad: cruce de horario', hash: '/agenda/nueva?fecha=2026-05-14', setup: async (p) => {
      await p.getByTestId('activity-title').fill('Reunión');
      await p.getByRole('group', { name: 'Tipo de actividad' }).getByRole('button', { name: 'Reunión', exact: true }).click();
      await p.getByTestId('activity-start').fill('15:00');
      await p.getByTestId('activity-end').fill('16:00');
      await p.getByRole('group', { name: 'Lugar o comunidad' }).getByRole('button', { name: 'Huayllay', exact: true }).click();
      await p.getByTestId('save-activity').click();
      await p.getByTestId('overlap-text').waitFor();
    } },
  { id: 'P-08', name: 'Actividad: detalle', setup: async (p) => {
      const id = await actividadId(p, 'Audiencia de alimentos');
      await p.goto(url({ reset: false, hash: `/agenda/${id}` }));
      await p.getByTestId('edit-activity').waitFor();
    } },
  { id: 'P-09', name: 'Envío: pendientes', hash: '/envio', query: 'seed=mixed' },
  { id: 'P-09', name: 'Envío: fallo parcial', hash: '/envio', query: 'seed=mixed&scenario=sync-partial&latency=50', setup: async (p) => {
      await p.getByTestId('envio-send').click();
      await p.getByTestId('sync-retry').waitFor();
    } },
  { id: 'P-09', name: 'Envío: error', hash: '/envio', query: 'seed=mixed&scenario=sync-error&latency=50', setup: async (p) => {
      await p.getByTestId('envio-send').click();
      await p.getByTestId('sync-retry').waitFor();
    } },
  { id: 'P-09', name: 'Envío: conflicto y [Ver y cambiar]', hash: '/envio', query: 'seed=mixed&scenario=conflict&latency=50', setup: async (p) => {
      await p.getByTestId('envio-send').click();
      await p.getByTestId('sync-view-change').click();
      await p.getByTestId('conflict-save').waitFor();
    } },
  { id: 'P-09', name: 'Envío: progreso', hash: '/envio', query: 'seed=mixed&freeze=1', setup: async (p) => {
      await p.getByTestId('envio-send').click();
      await p.getByTestId('sync-progress').waitFor();
    } },
  { id: 'P-10', name: 'Computadora', query: 'device=pc', viewport: { width: 1440, height: 900 } },
  { id: 'P-10', name: 'Computadora: editar', query: 'device=pc', viewport: { width: 1440, height: 900 }, setup: async (p) => {
      await p.getByTestId('pc-case-row').first().click();
      await p.getByTestId('pc-edit-save').waitFor();
    } },
  { id: 'Global', name: 'Menú: tamaño de letra', setup: async (p) => p.getByTestId('nav-font').click() },
];

interface Target {
  tag: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Problem {
  kind: 'tamaño' | 'separación';
  a: string;
  b?: string;
  detail: string;
}
interface TouchResult {
  pantalla: string;
  nombre: string;
  letra: string;
  objetivos: number;
  minAncho: number;
  minAlto: number;
  minSeparacion: number | null;
  fallos: Problem[];
}
interface ContrastResult {
  pantalla: string;
  nombre: string;
  letra: string;
  colorContrast: number;
  serias: number;
  otras: number;
  violaciones: { id: string; impact: string | null | undefined; help: string; nodes: string[] }[];
}

// Cada prueba guarda su resultado en un archivo: si una falla y Playwright reinicia el proceso, no se pierde nada.
const TMP = path.join(process.cwd(), 'test-results', 'audit-data');

/** Mide objetivos interactivos visibles en el navegador. */
async function measure(page: Page) {
  return page.evaluate(({ MIN, GAP }) => {
    const modals = [...document.querySelectorAll<HTMLElement>('[aria-modal="true"]')].filter((m) => m.checkVisibility());
    const scope: ParentNode = modals.length ? modals[modals.length - 1] : document.body;
    const sel = 'button, a[href], input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"]), label.check, label.btn';
    const textLike = (el: Element) =>
      el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'file', 'button', 'submit'].includes((el as HTMLInputElement).type));
    const layerOf = (el: Element) => {
      for (let e: Element | null = el; e; e = e.parentElement) {
        const pos = getComputedStyle(e).position;
        if (pos === 'fixed' || pos === 'sticky') return e;
      }
      return document.body;
    };
    const label = (el: Element) => {
      const t = (el.getAttribute('aria-label') || (el as HTMLElement).innerText || (el as HTMLInputElement).placeholder || el.getAttribute('data-testid') || '').trim().replace(/\s+/g, ' ');
      return `${el.tagName.toLowerCase()}${el.getAttribute('data-testid') ? `[${el.getAttribute('data-testid')}]` : ''} "${t.slice(0, 40)}"`;
    };
    const els = [...scope.querySelectorAll(sel)].filter((el) => {
      if (!(el as HTMLElement).checkVisibility({ checkOpacity: true, checkVisibilityCSS: true } as never)) return false;
      const r = el.getBoundingClientRect();
      if (r.width <= 2 || r.height <= 2) return false; // .sr-only (p. ej. input de archivo dentro de su botón)
      if (el.tagName === 'INPUT' && ['checkbox', 'radio'].includes((el as HTMLInputElement).type) && el.closest('label')) return false; // cuenta su label
      return true;
    });
    const t = els.map((el) => {
      const r = el.getBoundingClientRect();
      const layer = layerOf(el);
      const fixed = layer !== document.body;
      return {
        el,
        layer,
        name: label(el),
        text: textLike(el),
        x: r.left + (fixed ? 0 : scrollX),
        y: r.top + (fixed ? 0 : scrollY),
        w: r.width,
        h: r.height,
      };
    });
    const problems: { kind: 'tamaño' | 'separación'; a: string; b?: string; detail: string }[] = [];
    for (const a of t) {
      if (a.text) {
        if (a.h < MIN - 0.01) problems.push({ kind: 'tamaño', a: a.name, detail: `alto ${a.h.toFixed(1)} px` });
      } else if (a.w < MIN - 0.01 || a.h < MIN - 0.01) problems.push({ kind: 'tamaño', a: a.name, detail: `${a.w.toFixed(1)}×${a.h.toFixed(1)} px` });
    }
    let minGap: number | null = null;
    const spaced = t.filter((x) => !x.text);
    for (let i = 0; i < spaced.length; i++)
      for (let j = i + 1; j < spaced.length; j++) {
        const a = spaced[i];
        const b = spaced[j];
        if (a.layer !== b.layer) continue;
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const inside = (p: typeof a, q: typeof a) => p.x >= q.x - 0.5 && p.y >= q.y - 0.5 && p.x + p.w <= q.x + q.w + 0.5 && p.y + p.h <= q.y + q.h + 0.5;
        if (inside(a, b) || inside(b, a)) continue;
        const dx = Math.max(0, b.x - (a.x + a.w), a.x - (b.x + b.w));
        const dy = Math.max(0, b.y - (a.y + a.h), a.y - (b.y + b.h));
        const d = Math.hypot(dx, dy);
        if (d > 40) continue; // no son vecinos
        minGap = minGap === null ? d : Math.min(minGap, d);
        if (d < GAP - 0.01) problems.push({ kind: 'separación', a: a.name, b: b.name, detail: `${d.toFixed(1)} px` });
      }
    return {
      count: t.length,
      minW: t.length ? Math.min(...t.filter((x) => !x.text).map((x) => x.w), 9999) : 0,
      minH: t.length ? Math.min(...t.map((x) => x.h)) : 0,
      minGap,
      problems,
    };
  }, { MIN, GAP });
}

for (const font of ['normal', 'large'] as const) {
  test.describe(`Letra ${font === 'normal' ? 'Normal' : 'Grande'}`, () => {
    for (const s of SCREENS) {
      test(`${s.id} · ${s.name}`, async ({ page }) => {
        if (s.viewport) await page.setViewportSize(s.viewport);
        const q = [s.query, font === 'large' ? 'font=large' : ''].filter(Boolean).join('&');
        await page.goto(url({ hash: s.hash, query: q, pin: s.pin }));
        await stable(page);
        if (s.setup) await s.setup(page);
        await stable(page);
        const m = await measure(page);
        const letra = font === 'normal' ? 'Normal' : 'Grande';
        const idx = `${font}-${String(SCREENS.indexOf(s)).padStart(2, '0')}`;
        const tr: TouchResult = { pantalla: s.id, nombre: s.name, letra, objetivos: m.count, minAncho: m.minW, minAlto: m.minH, minSeparacion: m.minGap, fallos: m.problems };

        const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
        const v = axe.violations.map((x) => ({ id: x.id, impact: x.impact, help: x.help, nodes: x.nodes.slice(0, 8).map((n) => `${n.target.join(' ')} — ${n.failureSummary?.split('\n').slice(-1)[0] || ''}`) }));
        const cc = axe.violations.filter((x) => x.id === 'color-contrast').reduce((n, x) => n + x.nodes.length, 0);
        const serious = axe.violations.filter((x) => x.impact === 'serious' || x.impact === 'critical').reduce((n, x) => n + x.nodes.length, 0);
        const other = axe.violations.filter((x) => !(x.impact === 'serious' || x.impact === 'critical')).reduce((n, x) => n + x.nodes.length, 0);
        const cr: ContrastResult = { pantalla: s.id, nombre: s.name, letra, colorContrast: cc, serias: serious, otras: other, violaciones: v };
        fs.mkdirSync(TMP, { recursive: true });
        fs.writeFileSync(path.join(TMP, `${idx}.json`), JSON.stringify({ touch: tr, contrast: cr }), 'utf8');

        expect.soft(m.problems, 'Objetivos táctiles < 48×48 px o separación < 8 px').toEqual([]);
        expect.soft(v.filter((x) => x.id === 'color-contrast'), 'Contraste WCAG AA').toEqual([]);
        expect(v.filter((x) => x.impact === 'serious' || x.impact === 'critical'), 'Violaciones serias de axe').toEqual([]);
      });
    }
  });
}

test.afterAll(() => {
  const files = fs.existsSync(TMP) ? fs.readdirSync(TMP).filter((f) => f.endsWith('.json')) : [];
  const data = files.map((f) => JSON.parse(fs.readFileSync(path.join(TMP, f), 'utf8')) as { touch: TouchResult; contrast: ContrastResult });
  const touch = data.map((d) => d.touch);
  const contrast = data.map((d) => d.contrast);
  const dir = path.join(process.cwd(), 'docs', 'evidencia');
  fs.mkdirSync(dir, { recursive: true });
  const order = (a: { pantalla: string; nombre: string; letra: string }, b: typeof a) =>
    a.letra.localeCompare(b.letra) * -1 || a.pantalla.localeCompare(b.pantalla) || a.nombre.localeCompare(b.nombre);
  touch.sort(order);
  contrast.sort(order);
  const fecha = new Date().toISOString().slice(0, 10);

  const tFails = touch.reduce((n, r) => n + r.fallos.length, 0);
  let md = `# Objetivos táctiles\n\nGenerado por \`tests/audit.spec.ts\` (Playwright, ${fecha}). Tableta 1280×800 (P-10: 1440×900), letra Normal (18 px) y Grande (21 px).\n\n`;
  md += `Criterio: cada botón o control interactivo visible mide al menos ${MIN}×${MIN} px y está separado al menos ${GAP} px de los objetivos vecinos `;
  md += '(distancia entre rectángulos que no se contienen, en la misma capa). Las casillas cuentan por su etiqueta clicable. Los campos de texto, fechas y listas desplegables ocupan el ancho de su columna: se exige alto ≥ 48 px. WCAG 2.5.5 (44×44 px) se cita solo como piso de referencia.\n\n';
  md += `**Resultado: ${tFails === 0 ? 'sin fallos' : `${tFails} fallos`}** en ${touch.length} mediciones (${touch.reduce((n, r) => n + r.objetivos, 0)} objetivos).\n\n`;
  md += '| Pantalla | Estado medido | Letra | Objetivos | Ancho mín. (px) | Alto mín. (px) | Separación mín. entre vecinos (px) | Fallos |\n| :--- | :--- | :--- | ---: | ---: | ---: | ---: | ---: |\n';
  for (const r of touch)
    md += `| ${r.pantalla} | ${r.nombre} | ${r.letra} | ${r.objetivos} | ${r.minAncho.toFixed(0)} | ${r.minAlto.toFixed(0)} | ${r.minSeparacion === null ? '—' : r.minSeparacion.toFixed(0)} | ${r.fallos.length} |\n`;
  if (tFails) {
    md += '\n## Fallos\n\n';
    for (const r of touch) for (const f of r.fallos) md += `- ${r.pantalla} · ${r.nombre} · ${r.letra}: ${f.kind} ${f.a}${f.b ? ` ↔ ${f.b}` : ''} (${f.detail})\n`;
  }
  fs.writeFileSync(path.join(dir, 'objetivos-tactiles.md'), md, 'utf8');
  fs.writeFileSync(path.join(dir, 'objetivos-tactiles.json'), JSON.stringify(touch, null, 2), 'utf8');

  const cFails = contrast.reduce((n, r) => n + r.colorContrast + r.serias, 0);
  let cm = `# Contraste y accesibilidad (axe-core)\n\nGenerado por \`tests/audit.spec.ts\` con @axe-core/playwright, etiquetas \`wcag2a\` y \`wcag2aa\` (${fecha}). Se analiza cada pantalla en letra Normal y Grande.\n\n`;
  cm += `**Resultado: ${cFails === 0 ? '0 violaciones de contraste (color-contrast) y 0 violaciones serias o críticas' : `${cFails} nodos con fallos`}** en ${contrast.length} análisis.\n\n`;
  cm += '| Pantalla | Estado analizado | Letra | Contraste AA (nodos con fallo) | Serias o críticas | Moderadas o menores | Resultado |\n| :--- | :--- | :--- | ---: | ---: | ---: | :--- |\n';
  for (const r of contrast) cm += `| ${r.pantalla} | ${r.nombre} | ${r.letra} | ${r.colorContrast} | ${r.serias} | ${r.otras} | ${r.colorContrast + r.serias === 0 ? 'Cumple' : 'No cumple'} |\n`;
  const all = contrast.filter((r) => r.violaciones.length);
  if (all.length) {
    cm += '\n## Detalle de violaciones\n\n';
    for (const r of all) for (const v of r.violaciones) cm += `- ${r.pantalla} · ${r.nombre} · ${r.letra}: \`${v.id}\` (${v.impact}) ${v.help}: ${v.nodes.join('; ')}\n`;
  }
  fs.writeFileSync(path.join(dir, 'contraste.md'), cm, 'utf8');
  fs.writeFileSync(path.join(dir, 'contraste.json'), JSON.stringify(contrast, null, 2), 'utf8');
});
