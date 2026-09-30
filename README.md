# Justicia Cercana

Prototipo web funcional para el Examen Parcial de CS2H01 Interacción Humano-Computador (UTEC, 2026-2). Es el cuaderno digital de una jueza de paz rural para una **tableta de 10" en horizontal**: registra casos, actuaciones notariales y la agenda, **funciona sin Internet** (todo se guarda en la tableta) y envía los registros al Poder Judicial cuando hay conexión. También tiene una vista de computadora (1440×900) con los datos que ya llegaron.

- Frontend estático, sin backend: Vite + React + TypeScript, CSS propio, íconos Lucide y fuente Atkinson Hyperlegible empaquetados localmente.
- Datos ficticios guardados en `localStorage`; service worker (`vite-plugin-pwa`) para cargar sin Internet.
- El Poder Judicial, el envío, los conflictos y el desbloqueo por código están **simulados**.
- Documentación: [`docs/INFORME.md`](docs/INFORME.md) (informe) y [`docs/MATRIZ.md`](docs/MATRIZ.md) (matriz de justificación).

Enlace publicado: `https://isaacgamero.github.io/IhcParcial/`. PIN de demostración: **1234**.

## Cómo ejecutar

Requiere Node.js 20 o superior.

```bash
npm i              # instalar dependencias
npm run dev        # servidor de desarrollo: http://localhost:5173/justicia-cercana/
npm run tablet     # con "npm run dev" en marcha: abre Chrome + DevTools en la vista de tableta (1280×800)
npm run tablet:pc  # igual, en la vista de computadora P-10 (1440×900)
npm test           # pruebas y auditorías con Playwright
```

Otros scripts: `npm run build` (compila en `dist/`), `npm run preview` (sirve la compilación en el puerto 4173; es la forma de probar el service worker y la carga sin Internet en local) y `npm run captures` (capturas de pantalla con Playwright).

Enlace recomendado para la demostración (datos semilla del martes 12/05/2026):

```
http://localhost:5173/justicia-cercana/?reset=1&today=2026-05-12
```

## Parámetros de URL

Van antes del `#` (por ejemplo `?reset=1&today=2026-05-12#/agenda`). La interfaz de la jueza no muestra controles de depuración.

| Parámetro | Efecto |
| :--- | :--- |
| `demo=1` | Activa el modo demostración (reservado: en esta versión no cambia nada) |
| `reset=1` | Restablece los datos semilla (el parámetro se quita solo de la dirección) |
| `seed=base` | Elige el conjunto de datos semilla (`base` o `mixed`: registros sin enviar desde hace 5 días) |
| `today=2026-05-12` | Congela la fecha de "hoy" |
| `net=offline` | Fuerza el estado sin Internet en la interfaz |
| `scenario=sync-ok\|sync-partial\|sync-error\|conflict` | Resultado del envío al Poder Judicial |
| `freeze=1` | Los avisos temporales no desaparecen y la barra de progreso se detiene en 50 % |
| `annotate=1` | Muestra los marcadores numerados de la matriz de justificación |
| `battery=15` | Simula el nivel de batería (avisos al 20 % y al 10 %) |
| `font=large` | Fuerza el tamaño de letra Grande (`xlarge` para Muy grande) |
| `pin=skip` | Omite el PIN (solo para capturas que no son de P-00) |

Parámetros adicionales del prototipo: `device=pc` (fuerza la vista de computadora; también se activa sola con 1400 px de ancho o más), `time=HH:mm` (hora congelada junto con `today`) y `latency=700` (milisegundos por registro enviado).

## Vista de tableta en Chrome DevTools

Para ver la tableta exacta en Chrome: DevTools (`F12`) › **Toggle device toolbar** (`Ctrl+Shift+M`) con dos dispositivos personalizados:

| Dispositivo | Medidas | DPR | Tipo |
| :--- | :--- | :--- | :--- |
| Tableta 10" Justicia Cercana (1280x800) | 1280 × 800, horizontal | 2 | Mobile (táctil) |
| Computadora P-10 (1440x900) | 1440 × 900 | 1 | Desktop |

`npm run tablet` y `npm run tablet:pc` los registran y activan automáticamente con un perfil de Chrome propio (`.chrome-tablet/`). Pasos manuales en [`docs/DISPOSITIVO_CHROME.md`](docs/DISPOSITIVO_CHROME.md).

## Probar sin Internet

1. Abrir la aplicación publicada (o `npm run build` + `npm run preview`) una vez con Internet.
2. DevTools › Network › **Offline**. La barra muestra "Sin Internet · puede seguir trabajando".
3. Registrar algo: el contador pasa a "N registros por enviar" y el registro muestra "En la tableta". Recargar: la aplicación carga y los datos siguen ahí.
4. Volver a conectar: el envío empieza solo y confirma el resultado.

## Publicación en GitHub Pages

El workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) compila y publica en cada `push` a `main` (o a mano con "Run workflow").

1. Crear el repositorio con el nombre **`justicia-cercana`** (la `base` de Vite en `vite.config.ts` es `/justicia-cercana/`; si el nombre cambia, hay que cambiarla también).
2. Subir el código a la rama `main`.
3. En GitHub: **Settings › Pages › Build and deployment › Source: GitHub Actions**.
4. Esperar a que termine la acción "Publicar en GitHub Pages". La aplicación queda en `https://isaacgamero.github.io/IhcParcial/`.

Las rutas usan hash (`#/casos`, `#/casos/:id`), así que recargar cualquier pantalla no da error 404 en GitHub Pages.
