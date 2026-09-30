# Vista exacta de la tableta en Chrome DevTools

El prototipo se revisa en Chrome con **Toggle device toolbar** (DevTools, `Ctrl+Shift+M`) usando dos dispositivos personalizados con las mismas medidas que las capturas de Playwright:

| Dispositivo en DevTools | Ancho × alto | Device pixel ratio | Tipo | Uso |
| :--- | :--- | :--- | :--- | :--- |
| Tableta 10" Justicia Cercana (1280x800) | 1280 × 800 (horizontal) | 2 | Mobile, táctil | Pantallas P-00 a P-09 |
| Computadora P-10 (1440x900) | 1440 × 900 | 1 | Desktop, sin táctil | Pantalla P-10 |

## Automático

```bash
npm run tablet      # abre Chrome + DevTools, activa Toggle device toolbar en "Tableta 10""
npm run tablet:pc   # igual, con "Computadora P-10"
```

El script `scripts/chrome-tablet.mjs`:
1. Usa un perfil propio (`.chrome-tablet/`) para no modificar el perfil personal de Chrome.
2. Registra los dos dispositivos en DevTools (Configuración › Dispositivos) y deja seleccionado el que corresponde.
3. Abre la aplicación con DevTools (`--auto-open-devtools-for-tabs`) y pulsa **Toggle device toolbar** (`Ctrl+Shift+M`).
4. Mide la página y confirma el resultado, por ejemplo:
   `OK · vista tableta en DevTools: { ancho: 1280, alto: 800, dpr: 2, tactil: true, horizontal: true }`
   `OK · vista computadora en DevTools: { ancho: 1440, alto: 900, dpr: 1, tactil: false, horizontal: true }`

## Manual (cualquier Chrome)

1. Abrir la aplicación y DevTools (`F12`).
2. Pulsar **Toggle device toolbar** (ícono de tableta y teléfono, o `Ctrl+Shift+M`).
3. En el menú de dispositivos: **Edit…** › **Add custom device…**
   - Nombre: `Tableta 10" Justicia Cercana (1280x800)`, ancho `1280`, alto `800`, device pixel ratio `2`, tipo **Mobile** (activa el táctil).
   - Nombre: `Computadora P-10 (1440x900)`, ancho `1440`, alto `900`, device pixel ratio `1`, tipo **Desktop**.
4. Elegir el dispositivo en la barra y dejar el zoom en 100 %. Para la tableta se usa la orientación horizontal. Con el botón de rotar se ve el aviso "Gire la tableta para usarla de lado".
