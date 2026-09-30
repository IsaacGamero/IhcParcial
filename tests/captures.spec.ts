// Capturas obligatorias (sección 8.3) y su manifiesto captures/captures.json.
import { expect, test, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { bar, fillParty, open, party, stable, url } from './helpers';
import { flow1, flow2, flow3, flow4, flowA, flowB, syncVariant, type ShotMeta, type Snap } from './scenario';

const OUT = path.join(process.cwd(), 'captures');
const TMP = path.join(process.cwd(), 'test-results', 'captures-data');

const M = 'Cobertura y funcionamiento de los módulos';
const H = 'Principios de diseño y heurísticas';
const F = 'Factores humanos y dispositivo';
const O = 'Funcionamiento sin conexión';
const J = 'Justificación de las decisiones';

interface Entry {
  archivo: string;
  pantalla: string;
  flujo: string;
  paso: string;
  url_o_acciones: string;
  demuestra: string;
  criterio_rubrica: string;
}

/** Captura estable + entrada del manifiesto (cada entrada en su archivo: sobrevive a reinicios del proceso). */
function snapper(page: Page, acciones: string): Snap {
  return async (file: string, meta: ShotMeta) => {
    await stable(page);
    fs.mkdirSync(OUT, { recursive: true });
    await page.screenshot({ path: path.join(OUT, file) });
    const u = new URL(page.url());
    const e: Entry = {
      archivo: file,
      pantalla: meta.pantalla,
      flujo: meta.flujo,
      paso: meta.paso,
      url_o_acciones: `${u.pathname.replace('/justicia-cercana/', '')}${u.search}${u.hash} · ${acciones}`,
      demuestra: meta.demuestra,
      criterio_rubrica: meta.criterio,
    };
    fs.mkdirSync(TMP, { recursive: true });
    fs.writeFileSync(path.join(TMP, file + '.json'), JSON.stringify(e), 'utf8');
  };
}
const meta = (pantalla: string, demuestra: string, criterio: string, flujo = '—', paso = '—'): ShotMeta => ({ pantalla, flujo, paso, demuestra, criterio });

test.describe('Flujos 1, 2 y 4 (con service worker)', () => {
  test.use({ serviceWorkers: 'allow' });
  test('Flujos 1 → 2 → 4', async ({ page, context }) => {
    test.setTimeout(180_000);
    await page.goto(url({ query: 'latency=1500' }));
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
    });
    await flow1(page, context, snapper(page, 'Flujo 1 (reset=1, PIN 1234 con teclado, corte real con context.setOffline(true)); ver tests/scenario.ts'), 'latency=1500');
    await flow2(page, snapper(page, 'Flujo 2 a continuación del Flujo 1, sin Internet; la recarga simula el cierre de la aplicación'), 3);
    await flow4(page, context, snapper(page, 'Flujo 4 a continuación del Flujo 2; context.setOffline(false) devuelve el Internet'), 4);
  });
});

test('Flujo 3', async ({ page }) => {
  await flow3(page, snapper(page, 'Flujo 3 desde Inicio (reset=1)'));
});

for (const sc of ['sync-partial', 'sync-error', 'conflict'] as const)
  test(`Flujo 4 · variante ${sc}`, async ({ page }) => {
    await syncVariant(page, sc, snapper(page, `seed=mixed&scenario=${sc}; [Enviar ahora] en la barra`));
  });

test('Flujo A', async ({ page }) => {
  await flowA(page, snapper(page, 'Flujo A (reset=1): buscar, filtrar, registrar avance, editar'));
});

test('Flujo B', async ({ page }) => {
  await flowB(page, snapper(page, 'Flujo B: viewport 1440×900, device=pc'));
});

test('Pantallas P-00 a P-10 en estado normal', async ({ page }) => {
  const s = snapper(page, 'reset=1&today=2026-05-12');
  await page.goto(url({ pin: true }));
  await stable(page);
  await s('P-00_pin.png', meta('P-00', 'Ingreso con PIN: teclado numérico grande, sin patrón gestual', F));
  await page.getByTestId('pin-forgot').click();
  await s('P-00_olvido-pin.png', meta('P-00', '"¿Olvidó su PIN?" con explicación y campo para el código de la sede', H));

  await page.goto(url({ hash: '/intro' }));
  await stable(page);
  for (let i = 1; i <= 3; i++) {
    await s(`P-00b_introduccion-${i}.png`, meta('P-00b', `Introducción inicial, pantalla ${i} de 3, con [Saltar] visible`, H));
    if (i < 3) await page.getByTestId('intro-next').click();
  }
  await open(page, '/ayuda');
  await s('P-00b_ayuda.png', meta('P-00b', 'Ayuda: ver la introducción y tamaño de letra', H));
  await open(page, '/casos/nuevo');
  await page.getByRole('button', { name: 'Ayuda: Fecha de registro' }).click();
  await expect(page.getByRole('note')).toContainText('Ej.: 12/05/2026');
  await s('P-00b_ayuda-por-campo.png', meta('P-00b', 'Ayuda por campo (ícono help-circle): una línea con un ejemplo', H));

  await open(page, '/');
  await s('P-01_inicio.png', meta('P-01', 'Inicio: Hoy, casos que requieren atención con motivo en texto, próximos 7 días y accesos grandes', M));
  await open(page, '/casos');
  await s('P-02_casos-lista.png', meta('P-02', 'Lista de casos: búsqueda, filtros como botones, motivo de atención, borrador y distintivo por registro', M));
  await open(page, '/casos/nuevo');
  await s('P-03_caso-nuevo.png', meta('P-03', 'Caso nuevo, paso 1 de 3: código generado sin conexión, tipos con botones grandes', M));
  const id = await page.evaluate(() => JSON.parse(localStorage.getItem('jc-db-v1')!).cases.find((x: { codigo: string }) => x.codigo === 'JZ04-TAB01-202604-0005').id);
  await open(page, `/casos/${id}`);
  await s('P-04_caso-detalle.png', meta('P-04', 'Detalle: estado, distintivo, motivo "15+ días sin avance", historial, evidencias; [Registrar avance] abajo a la derecha', M));
  await open(page, '/actuaciones');
  await s('P-05_actuaciones-lista.png', meta('P-05', 'Lista de actuaciones con estado de atención, borrador y distintivo', M));
  await open(page, '/actuaciones/nueva');
  await s('P-06_actuacion-nueva.png', meta('P-06', 'Actuación nueva, paso 1: 4 tarjetas en lenguaje cotidiano + [Ver más trámites]', M));
  await open(page, '/agenda?vista=semana&fecha=2026-05-12');
  await s('P-07_agenda-semana.png', meta('P-07', 'Agenda Semana: franja "Mañana: 2 actividades", categorías color + ícono + texto, estados', M));
  await open(page, '/agenda?vista=mes&fecha=2026-05-12');
  await expect(page.getByTestId('agenda-month')).toContainText('+2 más');
  await s('P-07_agenda-mes.png', meta('P-07', 'Agenda Mes: hasta 3 actividades por día y "+2 más"', M));
  await open(page, '/agenda?vista=dia&fecha=2026-05-12');
  await s('P-07_agenda-dia.png', meta('P-07', 'Agenda Día (hoy)', M));
  await open(page, '/agenda/nueva');
  await s('P-08_actividad-nueva.png', meta('P-08', 'Actividad nueva: todos los campos, "(opcional)", condicional de hora de término', M));
  const act = await page.evaluate(() => JSON.parse(localStorage.getItem('jc-db-v1')!).actividades.find((x: { titulo: string }) => x.titulo === 'Audiencia de alimentos').id);
  await open(page, `/agenda/${act}`);
  await s('P-08_actividad-detalle.png', meta('P-08', 'Detalle de actividad: "Creada desde el caso" con enlace', M));
  await open(page, '/envio', 'seed=mixed');
  await s('P-09_envio.png', meta('P-09', 'Envío al Poder Judicial: registros por enviar con distintivo y [Enviar ahora]', O));
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/', 'device=pc');
  await s('P-10_computadora.png', meta('P-10', 'Vista en computadora 1440×900: tablas con más columnas, aviso del último envío', M));
});

test('Barra de estado en las 4 combinaciones', async ({ page, context }) => {
  const s = snapper(page, 'reset=1; seed=mixed para pendientes; context.setOffline(true) para "Sin Internet"');
  await open(page, '/');
  await expect(bar(page).data).toHaveText('Todo enviado');
  await s('G-01_barra-con-internet-todo-enviado.png', meta('Barra', '"Con Internet" (azul) · "Todo enviado" (verde) · último envío', O));
  await open(page, '/', 'seed=mixed');
  await expect(bar(page).send).toBeVisible();
  await s('G-02_barra-con-internet-pendientes-enviar-ahora.png', meta('Barra', '"4 registros por enviar" (ámbar) y botón visible [Enviar ahora]', O));
  await context.setOffline(true);
  await expect(bar(page).net).toHaveText('Sin Internet · puede seguir trabajando');
  await page.getByTestId('offline-notice').getByRole('button').click();
  await s('G-03_barra-sin-internet-pendientes.png', meta('Barra', '"Sin Internet" en gris (nunca rojo) · "4 registros por enviar"; sin [Enviar ahora]', O));
  await context.setOffline(false);
  await expect(bar(page).net).toHaveText('Con Internet');
  // Volver el Internet envía automáticamente: se espera "Todo enviado" y se corta de nuevo.
  await expect(bar(page).data).toHaveText('Todo enviado', { timeout: 20_000 });
  await page.locator('.sidenav').getByRole('link', { name: 'Inicio' }).click();
  await context.setOffline(true);
  await expect(bar(page).net).toHaveText('Sin Internet · puede seguir trabajando');
  await page.getByTestId('offline-notice').getByRole('button').click();
  await s('G-04_barra-sin-internet-todo-enviado.png', meta('Barra', '"Sin Internet" (gris) · "Todo enviado" (verde)', O));
  await context.setOffline(false);
});

test('Avisos y estados globales', async ({ page }) => {
  const s = snapper(page, 'reset=1&today=2026-05-12 + parámetros indicados');
  await open(page, '/', 'seed=mixed');
  await expect(page.getByTestId('home-send-reminder')).toBeVisible();
  await s('G-05_recordatorio-dias-sin-enviar.png', meta('P-01', 'Recordatorio "Lleva 5 días sin enviar sus registros…" (seed=mixed)', O));
  await open(page, '/envio', 'seed=mixed&freeze=1');
  await page.getByTestId('envio-send').click();
  await expect(page.getByTestId('sync-progress')).toContainText('Enviando 2 de 4…');
  await s('G-06_progreso-envio.png', meta('P-09', 'Progreso "Enviando 2 de 4…" con barra al 50 % y estado por registro (freeze=1)', O));

  await open(page, '/actuaciones/nueva');
  await page.getByTestId('act-type-0').click();
  await page.getByTestId('act-asunto').fill('Firma en contrato de alquiler.');
  await page.getByTestId('step-next').click();
  await fillParty(party(page, 1), { nombre: 'Ana Tito Ruiz', comunidad: 'San Pedro' });
  await page.getByTestId('step-next').click();
  await page.getByTestId('act-state-Concluida').click();
  await expect(page.getByText('Se pide cuando el trámite está Concluido').first()).toBeVisible();
  await s('G-07_opcional-y-condicionales.png', meta('P-06', 'Etiquetas "(opcional)" y líneas de campos condicionales ("Se pide cuando…")', H));

  await open(page, '/casos');
  await page.getByTestId('only-drafts').check();
  await s('G-08_borrador-casos.png', meta('P-02', '"Borrador · falta: personas" y casilla "Mostrar solo borradores" (casos)', H));
  await open(page, '/actuaciones');
  await page.getByTestId('act-only-drafts').check();
  await s('G-09_borrador-actuaciones.png', meta('P-05', '"Borrador · falta: personas" y filtro de borradores (actuaciones)', H));
  await open(page, '/agenda');
  await page.getByTestId('agenda-only-drafts').check();
  await s('G-10_borrador-agenda.png', meta('P-07', '"Borrador · falta: lugar" y filtro de borradores (agenda)', H));

  await open(page, '/casos/nuevo');
  await page.getByTestId('case-description').click();
  await expect(page.getByText('Puede hablar en vez de escribir: toque el micrófono del teclado.').first()).toBeVisible();
  await s('G-11_ayuda-dictado.png', meta('P-03', 'Ayuda de dictado del teclado bajo el campo largo (sin micrófono propio)', F));

  await open(page, '/', 'seed=mixed&battery=20');
  await expect(page.getByTestId('battery-send')).toBeVisible();
  await s('G-12_bateria-20.png', meta('P-01', 'Batería baja 20 %: lo registrado ya está en la tableta; [Enviar ahora]', F));
  await open(page, '/', 'battery=10');
  await expect(page.getByTestId('battery-banner')).toHaveClass(/critical/);
  await s('G-13_bateria-10.png', meta('P-01', 'Batería 10 %: aviso más visible', F));

  await open(page, '/casos/nuevo', 'font=large');
  await page.getByRole('button', { name: /^Problemas entre vecinos/ }).click();
  await page.getByTestId('case-description').fill('Discusión por el límite del terreno.');
  await page.getByTestId('step-next').click();
  await s('G-14_letra-grande-formulario.png', meta('P-03', 'Formulario en letra Grande (21 px) sin romper el diseño', F));

  await page.setViewportSize({ width: 800, height: 1280 });
  await open(page, '/');
  await expect(page.getByTestId('rotate-overlay')).toBeVisible();
  await s('G-15_gire-la-tableta.png', meta('Global', '"Gire la tableta para usarla de lado" en vertical 800×1280', F));
});

test('Versiones anotadas (annotate=1)', async ({ page }) => {
  const s = snapper(page, 'annotate=1');
  const shots: [string, string, string, string][] = [
    ['ANOT_P-01_inicio.png', 'P-01', '/', ''],
    ['ANOT_P-03_caso-nuevo.png', 'P-03', '/casos/nuevo', ''],
    ['ANOT_P-06_actuacion-nueva.png', 'P-06', '/actuaciones/nueva', ''],
    ['ANOT_P-07_agenda.png', 'P-07', '/agenda?vista=semana&fecha=2026-05-12', ''],
    ['ANOT_P-09_envio.png', 'P-09', '/envio', 'seed=mixed'],
  ];
  for (const [file, p, hash, q] of shots) {
    await open(page, hash, ['annotate=1', q].filter(Boolean).join('&'));
    await expect(page.locator('.mark').first()).toBeVisible();
    await s(file, meta(p, 'Marcadores numerados = IDs de la matriz de justificación', J));
  }
});

test.afterAll(() => {
  if (!fs.existsSync(TMP)) return;
  const entries = fs
    .readdirSync(TMP)
    .filter((f) => f.endsWith('.json') && fs.existsSync(path.join(OUT, f.replace(/\.json$/, ''))))
    .map((f) => JSON.parse(fs.readFileSync(path.join(TMP, f), 'utf8')) as Entry)
    .sort((a, b) => a.archivo.localeCompare(b.archivo));
  fs.writeFileSync(path.join(OUT, 'captures.json'), JSON.stringify(entries, null, 2) + '\n', 'utf8');
});
