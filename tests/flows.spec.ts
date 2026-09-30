import { expect, test } from '@playwright/test';
import { bar, open, skipIntroIfShown, stable, typePin, url } from './helpers';
import { flow1, flow2, flow3, flow4, flowA, flowB, syncVariant } from './scenario';

// Flujos 1 → 2 → 4 encadenados en la misma sesión (sin restablecer entre ellos), con service worker:
// el corte de Internet es real y la recarga del Flujo 2 ocurre sin Internet, como en la tableta.
test.describe('Flujos 1, 2 y 4 encadenados (con service worker)', () => {
  test.use({ serviceWorkers: 'allow' });

  test('Flujo 1 → Flujo 2 → Flujo 4', async ({ page, context }) => {
    test.setTimeout(180_000);
    // Primera visita con Internet: instala el service worker.
    await page.goto(url({ query: 'latency=1500' }));
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
    });
    await flow1(page, context, undefined, 'latency=1500');
    await flow2(page, undefined, 3);
    await flow4(page, context, undefined, 4);
  });

  test('La aplicación carga sin Internet tras la primera visita', async ({ page, context }) => {
    await page.goto(url({ pin: true }));
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
    });
    await context.setOffline(true);
    await page.reload();
    await typePin(page);
    await skipIntroIfShown(page);
    await expect(bar(page).net).toHaveText('Sin Internet · puede seguir trabajando');
    await page.goto(url({ reset: false, hash: '/agenda' }));
    await expect(page.getByTestId('agenda-week')).toBeVisible();
  });
});

test('PIN incorrecto y "¿Olvidó su PIN?"', async ({ page }) => {
  await page.goto(url({ pin: true }));
  await typePin(page, '1111');
  await expect(page.getByTestId('pin-error')).toHaveText('PIN incorrecto. Intente otra vez.');
  await page.getByTestId('pin-forgot').click();
  await expect(page.getByText('Llame a la sede del Poder Judicial. Le darán un código para desbloquear la tableta.')).toBeVisible();
});

test('Flujo 3 · Revisar las actividades de la semana', async ({ page }) => {
  await flow3(page);
});

test.describe('Variantes del envío', () => {
  for (const sc of ['sync-partial', 'sync-error', 'conflict'] as const) {
    test(`scenario=${sc}`, async ({ page }) => {
      await syncVariant(page, sc);
    });
  }
});

test('Flujo A · Actualizar el avance de un caso', async ({ page }) => {
  await flowA(page);
});

test('Flujo B · Computadora 1440×900', async ({ page }) => {
  await flowB(page);
});

test.describe('Barra de estado: 4 combinaciones', () => {
  test('Con Internet · Todo enviado', async ({ page }) => {
    await open(page);
    await expect(bar(page).net).toHaveText('Con Internet');
    await expect(bar(page).net).toHaveClass(/t-blue/);
    await expect(bar(page).data).toHaveText('Todo enviado');
    await expect(bar(page).data).toHaveClass(/t-green/);
    await expect(bar(page).send).toHaveCount(0);
    await expect(page.getByTestId('sb-last')).toHaveText('Último envío: 11/05, 18:40');
  });
  test('Con Internet · pendientes + [Enviar ahora]', async ({ page }) => {
    await open(page, '/', 'seed=mixed');
    await expect(bar(page).net).toHaveText('Con Internet');
    await expect(bar(page).data).toHaveText('4 registros por enviar');
    await expect(bar(page).data).toHaveClass(/t-amber/);
    await expect(bar(page).send).toHaveText('Enviar ahora');
  });
  test('Sin Internet · Todo enviado', async ({ page, context }) => {
    await open(page);
    await context.setOffline(true);
    await expect(bar(page).net).toHaveText('Sin Internet · puede seguir trabajando');
    await expect(bar(page).net).toHaveClass(/t-gray/);
    await expect(bar(page).data).toHaveText('Todo enviado');
    await expect(bar(page).send).toHaveCount(0);
  });
  test('Sin Internet · pendientes (sin [Enviar ahora])', async ({ page, context }) => {
    await open(page, '/', 'seed=mixed');
    await context.setOffline(true);
    await expect(bar(page).net).toHaveText('Sin Internet · puede seguir trabajando');
    await expect(bar(page).data).toHaveText('4 registros por enviar');
    await expect(bar(page).send).toHaveCount(0);
  });
});

test('Recordatorio de días sin enviar (seed=mixed)', async ({ page }) => {
  await open(page, '/', 'seed=mixed');
  await expect(page.getByTestId('home-send-reminder')).toHaveText(
    'Lleva 5 días sin enviar sus registros. Si la tableta se pierde o daña, lo no enviado se perdería. Envíelos cuando tenga Internet.',
  );
});

test('Progreso detenido en 50 % (freeze=1)', async ({ page }) => {
  await open(page, '/', 'seed=mixed&freeze=1');
  await bar(page).send.click();
  await expect(page.getByTestId('sync-progress')).toContainText('Enviando 2 de 4…');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
});

test.describe('Batería, letra y orientación', () => {
  test('Batería 15 %: aviso con [Enviar ahora]', async ({ page }) => {
    await open(page, '/', 'seed=mixed&battery=15');
    const b = page.getByTestId('battery-banner');
    await expect(b).toContainText('Batería baja (15 %). Lo que registró ya está guardado en la tableta.');
    await expect(b).not.toHaveClass(/critical/);
    await expect(page.getByTestId('battery-send')).toBeVisible();
  });
  test('Batería 8 %: aviso más visible', async ({ page }) => {
    await open(page, '/', 'battery=8');
    const b = page.getByTestId('battery-banner');
    await expect(b).toContainText('Batería baja (8 %). Lo que registró ya está guardado en la tableta.');
    await expect(b).toHaveClass(/critical/);
  });
  test('font=large: letra Grande (21 px)', async ({ page }) => {
    await open(page, '/casos/nuevo', 'font=large');
    await expect(page.locator('html')).toHaveAttribute('data-font', 'large');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe('21px');
  });
  test('Tamaño de letra desde el menú y se recuerda', async ({ page }) => {
    await open(page);
    await page.getByTestId('nav-font').click();
    await page.getByTestId('font-xlarge').click();
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe('24px');
    await page.goto(url({ reset: false }));
    await stable(page);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe('24px');
  });
  test('Vertical 800×1280: "Gire la tableta"', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 1280 });
    await open(page);
    await expect(page.getByTestId('rotate-overlay')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Gire la tableta para usarla de lado' })).toBeVisible();
  });
});

test.describe('Borrador · falta en los tres módulos', () => {
  test('Casos, actuaciones y agenda con "Mostrar solo borradores"', async ({ page }) => {
    await open(page, '/casos');
    await page.getByTestId('only-drafts').check();
    await expect(page.getByTestId('case-row')).toHaveCount(1);
    await expect(page.getByTestId('case-row')).toContainText('Borrador · falta: personas');
    await page.goto(url({ reset: false, hash: '/actuaciones' }));
    await page.getByTestId('act-only-drafts').check();
    await expect(page.getByTestId('act-row')).toHaveCount(1);
    await expect(page.getByTestId('act-row')).toContainText('Borrador · falta: personas');
    await page.goto(url({ reset: false, hash: '/agenda' }));
    await page.getByTestId('agenda-only-drafts').check();
    await expect(page.getByTestId('agenda-results').getByTestId('activity-item')).toHaveCount(1);
    await expect(page.getByTestId('agenda-results')).toContainText('Borrador · falta: lugar');
  });
});
