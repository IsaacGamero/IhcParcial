import { expect, type Locator, type Page } from '@playwright/test';

export const TODAY = '2026-05-12';

/** URL con datos semilla restablecidos y fecha congelada. */
export function url(opts: { query?: string; hash?: string; pin?: boolean; reset?: boolean } = {}) {
  const q = [opts.reset === false ? '' : 'reset=1', `today=${TODAY}`, opts.pin ? '' : 'pin=skip', opts.query || ''].filter(Boolean).join('&');
  return `?${q}${opts.hash ? `#${opts.hash}` : ''}`;
}

export async function open(page: Page, hash = '/', query = '') {
  await page.goto(url({ hash, query }));
  await stable(page);
}

/** Espera interfaz estable: fuentes cargadas y sin animaciones pendientes. */
export async function stable(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.waitForTimeout(150);
}

/** PIN real con el teclado físico. */
export async function typePin(page: Page, pin = '1234') {
  await expect(page.getByRole('heading', { name: 'Ingrese su PIN' })).toBeVisible();
  for (const k of pin) await page.keyboard.press(k);
}

export async function skipIntroIfShown(page: Page) {
  const skip = page.getByTestId('intro-skip');
  try {
    await skip.waitFor({ state: 'visible', timeout: 2500 });
    await skip.click();
  } catch {
    /* sin introducción */
  }
}

export const bar = (page: Page) => ({
  net: page.getByTestId('sb-net'),
  data: page.getByTestId('sb-data'),
  send: page.getByTestId('sb-send'),
});

export const party = (page: Page, n: number) => page.locator(`section[data-party="${n}"]`);

export async function fillParty(sec: Locator, p: { rol?: string; nombre?: string; doc?: string; comunidad?: string }) {
  if (p.rol) await sec.getByRole('group', { name: /Rol|Participación/ }).getByRole('button', { name: p.rol, exact: true }).click();
  if (p.nombre !== undefined) {
    await sec.getByLabel('Nombres y apellidos').fill(p.nombre);
    await sec.getByLabel('Nombres y apellidos').blur();
  }
  if (p.doc) await sec.getByRole('group', { name: 'Tipo de documento' }).getByRole('button', { name: p.doc, exact: true }).click();
  if (p.comunidad !== undefined) {
    await sec.getByLabel('Comunidad o localidad').fill(p.comunidad);
    await sec.getByLabel('Comunidad o localidad').blur();
  }
}

export const toast = (page: Page, text: string | RegExp) => page.locator('.toasts .toast').filter({ hasText: text });

/** PNG 2×2 para simular la foto del acta. */
export const PHOTO = {
  name: 'acta.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGNk+M/AwMDAxMDAwMDAAAAMGgEBa2x6ZgAAAABJRU5ErkJggg==',
    'base64',
  ),
};
