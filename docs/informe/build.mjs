// Genera matriz.tex y capturas.tex a partir de docs/matriz/matriz.json y captures/captures.json.
// Uso: node docs/informe/build.mjs
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const OUT = resolve(import.meta.dirname);

const tex = (s) =>
  String(s ?? '')
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([#$%&_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/≥/g, '$\\geq$')
    .replace(/→/g, '$\\rightarrow$')
    .replace(/[“”]/g, '"')
    .replace(/"([^"]*)"/g, "``$1''");

// ---- Matriz de justificación ----
const matriz = JSON.parse(readFileSync(join(ROOT, 'docs/matriz/matriz.json'), 'utf8'));
const rows = matriz
  .map((r) => [r.id, r.pantalla, r.elemento, r.necesidad, `${r.norman} / ${r.nielsen}`, r.factor, r.efecto].map(tex).join(' & ') + ' \\\\ \\hline')
  .join('\n');
writeFileSync(
  join(OUT, 'matriz.tex'),
  `\\begin{scriptsize}
\\begin{longtable}{|L{0.4cm}|L{1.3cm}|L{2.6cm}|L{2.3cm}|L{2.3cm}|L{1.9cm}|L{2.9cm}|}
\\hline
\\textbf{ID} & \\textbf{Pantalla} & \\textbf{Elemento} & \\textbf{Necesidad} & \\textbf{Norman / Nielsen} & \\textbf{Factor humano} & \\textbf{Cómo facilita o previene errores} \\\\ \\hline
\\endhead
${rows}
\\end{longtable}
\\end{scriptsize}
`,
);

// ---- Capturas (desde el manifiesto) ----
const manPath = join(ROOT, 'captures/captures.json');
let caps = '';
if (existsSync(manPath)) {
  const man = JSON.parse(readFileSync(manPath, 'utf8'));
  const groups = new Map();
  for (const c of man) {
    const g = c.flujo || 'Otras';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(c);
  }
  for (const [g, list] of groups) {
    caps += `\\subsection*{${tex(g)}}\n\\noindent\n`;
    list.forEach((c, i) => {
      const paso = c.paso && c.paso !== '—' ? ' · ' + tex(c.paso) : '';
      caps += `\\begin{minipage}[t]{0.49\\textwidth}\\centering\\includegraphics[width=\\linewidth]{../../captures/${c.archivo}}\\\\[-2pt]{\\footnotesize\\raggedright\\textbf{${tex(c.pantalla)}${paso}.} ${tex(c.demuestra)} \\emph{(${tex(c.criterio_rubrica)})}\\par}\\end{minipage}${i % 2 === 0 ? '\\hfill' : '\\par\\vspace{8pt}\\noindent'}\n`;
    });
    caps += '\\par\\vspace{4pt}\n';
  }
} else {
  caps = '\\emph{Ejecutar \\texttt{npm run captures} y \\texttt{node docs/informe/build.mjs}.}\n';
}
writeFileSync(join(OUT, 'capturas.tex'), caps);
// ---- Evidencia: objetivos táctiles y contraste, resumidos por pantalla ----
const load = (p) => (existsSync(join(ROOT, p)) ? JSON.parse(readFileSync(join(ROOT, p), 'utf8')) : []);
const touch = load('docs/evidencia/objetivos-tactiles.json');
const contrast = load('docs/evidencia/contraste.json');
const byScreen = new Map();
for (const t of touch) {
  const s = byScreen.get(t.pantalla) || { obj: 0, w: Infinity, h: Infinity, sep: Infinity, fallos: 0, cc: 0, serias: 0 };
  s.obj += t.objetivos;
  s.w = Math.min(s.w, t.minAncho);
  s.h = Math.min(s.h, t.minAlto);
  if (t.minSeparacion != null) s.sep = Math.min(s.sep, t.minSeparacion);
  s.fallos += t.fallos.length;
  byScreen.set(t.pantalla, s);
}
for (const c of contrast) {
  const s = byScreen.get(c.pantalla) || { obj: 0, w: Infinity, h: Infinity, sep: Infinity, fallos: 0, cc: 0, serias: 0 };
  s.cc += c.colorContrast;
  s.serias += c.serias;
  byScreen.set(c.pantalla, s);
}
const n = (v) => (Number.isFinite(v) ? Math.round(v) : '—');
const evRows = [...byScreen]
  .map(([p, s]) => `${tex(p)} & ${s.obj} & ${n(s.w)}×${n(s.h)} & ${n(s.sep)} & ${s.fallos} & ${s.cc} & ${s.serias} \\\\ \\hline`)
  .join('\n');
const totalFallos = touch.reduce((a, t) => a + t.fallos.length, 0);
const totalCC = contrast.reduce((a, c) => a + c.colorContrast, 0);
writeFileSync(
  join(OUT, 'evidencia.tex'),
  `Medición automática con Playwright (\\texttt{tests/audit.spec.ts}) en ${touch.length} estados de pantalla, con letra Normal y Grande. Criterio: 48×48 px como mínimo y 8 px de separación. WCAG 2.5.5 (44×44 px) solo se usa como piso de referencia. El contraste se revisó con axe-core (WCAG 2 AA). Resultado: ${totalFallos} fallos táctiles y ${totalCC} fallos de contraste.

\\begin{center}\\small
\\begin{tabular}{|l|r|c|r|r|r|r|}\\hline
\\textbf{Pantalla} & \\textbf{Objetivos} & \\textbf{Mín. (px)} & \\textbf{Sep. mín.} & \\textbf{Fallos táctiles} & \\textbf{Contraste} & \\textbf{Serias}\\\\\\hline
${evRows}
\\end{tabular}
\\end{center}
`,
);

console.log(`matriz.tex: ${matriz.length} filas · capturas.tex: ${existsSync(manPath) ? 'desde manifiesto' : 'pendiente'}`);
