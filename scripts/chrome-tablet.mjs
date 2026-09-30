// Abre Chrome con DevTools configurado en la vista exacta de la tableta del prototipo:
// 1280×800 horizontal, táctil, devicePixelRatio 2 (igual que las capturas de Playwright).
// Usa un perfil propio (.chrome-tablet/) para no tocar el perfil personal de Chrome.
//
// Uso:  npm run tablet            (tableta 1280×800)
//       npm run tablet -- --pc    (computadora 1440×900, P-10)
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const PC = process.argv.includes('--pc');
const ROOT = resolve(import.meta.dirname, '..');
const PROFILE = join(ROOT, '.chrome-tablet');
const PORT = 9333;
const APP = 'http://localhost:5173/justicia-cercana/';
const QUERY = '?reset=1&today=2026-05-12' + (PC ? '&device=pc&pin=skip' : '');

const CHROME = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
].find((p) => p && existsSync(p));
if (!CHROME) throw new Error('No se encontró Chrome. Defina CHROME_PATH.');

// ---- Dispositivos personalizados de DevTools (Configuración > Dispositivos) ----
const UA_TABLET =
  'Mozilla/5.0 (Linux; Android 14; Tablet 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36';
const UA_PC =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36';
const device = (title, w, h, dpr, touch) => ({
  title,
  type: touch ? 'tablet' : 'desktop',
  'user-agent': touch ? UA_TABLET : UA_PC,
  capabilities: touch ? ['touch', 'mobile'] : [],
  screen: { 'device-pixel-ratio': dpr, vertical: { width: h, height: w }, horizontal: { width: w, height: h } },
  modes: [
    { title: '', orientation: 'vertical', insets: { left: 0, top: 0, right: 0, bottom: 0 } },
    { title: '', orientation: 'horizontal', insets: { left: 0, top: 0, right: 0, bottom: 0 } },
  ],
  'show-by-default': true,
  show: 'Always',
  'dual-screen': false,
  'foldable-screen': false,
});
const TABLET = device('Tableta 10" Justicia Cercana (1280x800)', 1280, 800, 2, true);
const LAPTOP = device('Computadora P-10 (1440x900)', 1440, 900, 1, false);
const selected = PC ? LAPTOP : TABLET;

const devtoolsPrefs = {
  'custom-emulated-device-list': JSON.stringify([TABLET, LAPTOP]),
  'emulation.show-device-mode': 'false', // se enciende con Toggle device toolbar
  'emulation.device-mode-value': JSON.stringify({ device: selected.title, orientation: 'horizontal', mode: '' }),
  'emulation.device-width': JSON.stringify(PC ? 1440 : 1280),
  'emulation.device-height': JSON.stringify(PC ? 900 : 800),
  'emulation.device-scale-factor': JSON.stringify(PC ? 1 : 2),
  'emulation.device-ua': JSON.stringify(PC ? 'Desktop' : 'Mobile'),
  'emulation.device-scale': '1',
  'emulation.auto-adjust-scale': 'false',
  'currentDockState': '"right"',
};

// Si ya hay un Chrome abierto con este perfil, se cierra para que no sobrescriba las preferencias.
try {
  const prev = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`, { timeout: 2000 });
  await (await prev.newBrowserCDPSession()).send('Browser.close').catch(() => {});
  for (let i = 0; i < 40; i++) {
    try {
      await fetch(`http://127.0.0.1:${PORT}/json/version`);
      await new Promise((r) => setTimeout(r, 250));
    } catch {
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 1500));
} catch {
  /* no había otra instancia */
}

mkdirSync(join(PROFILE, 'Default'), { recursive: true });
const prefFile = join(PROFILE, 'Default', 'Preferences');
let prefs = {};
try {
  prefs = JSON.parse(readFileSync(prefFile, 'utf8'));
} catch {}
prefs.devtools = prefs.devtools || {};
prefs.devtools.preferences = { ...(prefs.devtools.preferences || {}), ...devtoolsPrefs };
prefs.intl = { ...(prefs.intl || {}), accept_languages: 'es-PE,es' };
writeFileSync(prefFile, JSON.stringify(prefs));

// ---- Servidor de desarrollo (si no está corriendo) ----
async function up(url) {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}
if (!(await up(APP))) {
  console.log('Iniciando servidor de desarrollo…');
  spawn('npx', ['vite', '--port', '5173', '--strictPort'], { cwd: ROOT, shell: true, stdio: 'ignore', detached: true }).unref();
  for (let i = 0; i < 60 && !(await up(APP)); i++) await new Promise((r) => setTimeout(r, 500));
}

// ---- Chrome con DevTools abierto ----
spawn(
  CHROME,
  [
    `--user-data-dir=${PROFILE}`,
    `--remote-debugging-port=${PORT}`,
    '--auto-open-devtools-for-tabs',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1920,1080',
    APP + QUERY,
  ],
  { detached: true, stdio: 'ignore' },
).unref();

// ---- Verificación: medidas reales de la página con el modo dispositivo de DevTools ----
// Se reconecta hasta ver la página y la ventana de DevTools (que se abre unos segundos después).
const [w, h] = PC ? [1440, 900] : [1280, 800];
let browser, app, dt;
for (let i = 0; i < 60 && !(app && dt); i++) {
  await new Promise((r) => setTimeout(r, 1000));
  try {
    if (browser) await browser.close().catch(() => {});
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
    const pages = browser.contexts()[0].pages();
    app = pages.find((p) => p.url().startsWith(APP));
    dt = pages.find((p) => p.url().startsWith('devtools://'));
  } catch {
    /* Chrome aún arrancando */
  }
}
if (!(app && dt)) throw new Error('No se encontró la página o DevTools en Chrome.');
const measure = () =>
  app.evaluate(() => ({
    ancho: innerWidth,
    alto: innerHeight,
    dpr: Math.round(devicePixelRatio * 100) / 100,
    tactil: navigator.maxTouchPoints > 0,
    horizontal: matchMedia('(orientation: landscape)').matches,
  }));
await new Promise((r) => setTimeout(r, 1500));
// "Toggle device toolbar" de DevTools (Ctrl+Shift+M): enciende la barra de dispositivo con el
// dispositivo elegido (tableta o computadora) y ajusta la página a su tamaño exacto.
const toggleDeviceToolbar = async () => {
  await dt.bringToFront();
  await dt.keyboard.press('Control+Shift+M');
  await new Promise((r) => setTimeout(r, 1500));
  await app.bringToFront();
};
let info = await measure();
if (info.ancho !== w) {
  await toggleDeviceToolbar();
  info = await measure();
}
const ok = info.ancho === w && info.alto === h;
console.log(`${ok ? 'OK' : 'REVISAR'} · vista ${PC ? 'computadora' : 'tableta'} en DevTools:`, info);
process.exit(ok ? 0 : 1);
