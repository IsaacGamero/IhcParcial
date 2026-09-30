# Brief común para subagentes — Prototipo "Justicia Cercana"

Proyecto: `C:\Users\Isaac\ihc\justicia-cercana` (Vite 5 + React 18 + TS, CSS propio, lucide-react local).
Especificación completa: `C:\Users\Isaac\ihc\workflow_examen_parcial_claude_final(1).md` (LEE las secciones que te tocan + la 3 completa). Fuente de verdad: el PDF `C:\Users\Isaac\ihc\ExamenParcial 2026-2.pdf`.

## REGLA DE ESTILO DEL USUARIO (prioritaria)
**Minimalismo. La interfaz hace más de lo que dice.** No agregues textos explicativos, subtítulos, párrafos de ayuda, tarjetas decorativas ni elementos que no sean estrictamente necesarios. Solo los textos/mensajes que exige el workflow (mensajes de validación, confirmaciones, estados). Etiquetas cortas. Si dudas, no lo pongas.

## Base ya construida (NO la reescribas; puedes usarla)
- `src/lib/types.ts` modelo; `src/lib/store.ts` (useDB, getDB, setDB, saveCase/saveActuacion/saveActividad (ponen sync='local'), nextCode/peekCode, setDraft, pendingRecords, uid); `src/lib/seed.ts` datos semilla (hoy = martes 2026-05-12); `src/lib/domain.ts` catálogos, validateParty, findDuplicatePerson, findDuplicateActuacion, missingCaso/missingActuacion/missingActividad (Borrador · falta), attentionReason; `src/lib/dates.ts` (todayISO, nowISO, fmt*, addDays…, respeta `?today=`); `src/lib/params.ts` parámetros URL + `tap()` ("Toca"/"Haz clic"); `src/lib/router.ts` (useRoute, navigate); `src/lib/notices.ts` (notify → toasts); `src/lib/autosave.ts` (useAutosave: saveNow en onBlur, cada 3 s, clear al guardar); `src/lib/connectivity.ts` (useOnline).
- `src/components/ui.tsx`: Mark (marcador modo anotado), SyncBadge, DraftTag, CaseStateBadge, ActStateBadge, AttentionBadge, CategoryTag, ActivityStateTag, Field (label, optional→"(opcional)", cond→línea de condicional, help→ícono ayuda, error, modified→"Modificado"), Seg (botones segmentados), Stepper ("Paso 2 de 3"), ActionBar (barra inferior fija; acción principal a la derecha), Modal, DictationHint, Toasts.
- `src/components/PartyEditor.tsx`: editor de partes/participantes con detección de duplicados.
- `src/styles.css`: clases `.btn .btn-primary .btn-lg .card .item .list .grid2 .grid3 .choices .choice .seg .badge .t-blue/.t-gray/.t-amber/.t-green/.t-red .banner .tbl .row .col .spacer .muted .small .legal`. Puedes añadir CSS al final del archivo **solo en un bloque comentado con tu nombre de agente**.
- Rutas (hash) en `src/App.tsx`: `/`, `/casos`, `/casos/nuevo`, `/casos/:id`, `/casos/:id/editar`, `/actuaciones`, `/actuaciones/nueva`, `/actuaciones/:id`, `/actuaciones/:id/editar`, `/agenda`, `/agenda/nueva`, `/agenda/:id`, `/agenda/:id/editar`, `/envio`, `/ayuda`. Query extra en el hash: `#/casos/nuevo?continuar=1` = cargar borrador guardado (db.drafts[kind]); `#/agenda?vista=dia&fecha=2026-05-13`.

## Convenciones obligatorias
- Solo edita los archivos que te asignan. Si necesitas algo en un archivo compartido (lib/, components/), NO lo edites: escríbelo en tu propio archivo o repórtalo en tu respuesta final.
- Tamaños táctiles ≥ 48×48 px y separación ≥ 8 px (usa .btn/.seg/.choice que ya cumplen). Sin gestos ocultos (nada de swipe/long-press).
- Color nunca solo: ícono + texto. "Sin Internet" gris, nunca rojo. Guardado → "guardado en la tableta" + distintivo ámbar "En la tableta" (no verde).
- Sin asteriscos. Opcionales con "(opcional)". Condicionales con línea `cond`.
- Vocabulario: "Toca" (usa `tap()` si el texto depende del dispositivo). Prohibido en UI: "sincronizar", "modo local", "offline", "servidor", "clic" en tableta.
- Acción principal de cada pantalla en `<ActionBar>` abajo a la derecha. Formularios largos en 3 pasos con Stepper, [Atrás] [Siguiente], y siempre se puede guardar (queda Borrador si faltan mínimos).
- Textos largos: mostrar `<DictationHint/>` bajo el textarea.
- Distintivo `SyncBadge` en cada fila y cada detalle. Borradores: `DraftTag` + casilla "Mostrar solo borradores" en las listas.
- Añade `data-testid` estables en botones/elementos clave (el agente de pruebas los usará). Prefiere también textos accesibles (roles + nombres) coherentes con el workflow.
- Modo anotado: coloca `<Mark n={ID}/>` junto a los elementos que justificas. Usa SOLO tu rango de IDs. Escribe tus filas de la matriz en `docs/matriz/<tu-modulo>.json` como arreglo de objetos `{ "id", "pantalla", "elemento", "necesidad", "norman", "nielsen", "factor", "efecto" }` (mínimo 3 filas por pantalla; el efecto debe seguirse causalmente del elemento). Rangos: global/barra/menú 1–9 (ya usados 1–4 por la base); P-00/P-00b/P-09/P-10/shell 70–89; P-01/P-07/P-08 50–69; P-02/P-03/P-04 10–29; P-05/P-06 30–49.
- Verifica con `npx tsc -b` (sin errores) antes de terminar. Puedes probar en el navegador con Playwright (`npx playwright` ya instalado, chromium) contra `npm run dev` (http://localhost:5173/justicia-cercana/?reset=1&today=2026-05-12&pin=skip) — usa un puerto propio si lo arrancas (`npx vite --port 51xx`) para no chocar con otros agentes, y mátalo al terminar.
- Archivos UTF-8. Datos ficticios. Todo en español.
