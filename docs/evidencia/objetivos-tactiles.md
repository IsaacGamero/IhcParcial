# Objetivos táctiles

Generado por `tests/audit.spec.ts` (Playwright, 2026-09-30). Tableta 1280×800 (P-10: 1440×900), letra Normal (18 px) y Grande (21 px).

Criterio: cada botón o control interactivo visible mide al menos 48×48 px y está separado al menos 8 px de los objetivos vecinos (distancia entre rectángulos que no se contienen, en la misma capa). Las casillas cuentan por su etiqueta clicable. Los campos de texto, fechas y listas desplegables ocupan el ancho de su columna: se exige alto ≥ 48 px. WCAG 2.5.5 (44×44 px) se cita solo como piso de referencia.

**Resultado: sin fallos** en 72 mediciones (1408 objetivos).

| Pantalla | Estado medido | Letra | Objetivos | Ancho mín. (px) | Alto mín. (px) | Separación mín. entre vecinos (px) | Fallos |
| :--- | :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| Global | Menú: tamaño de letra | Normal | 5 | 48 | 48 | 8 | 0 |
| P-00 | ¿Olvidó su PIN? | Normal | 3 | 104 | 48 | — | 0 |
| P-00 | PIN | Normal | 12 | 96 | 48 | 12 | 0 |
| P-00b | Ayuda | Normal | 14 | 97 | 48 | 8 | 0 |
| P-00b | Introducción | Normal | 2 | 101 | 64 | — | 0 |
| P-01 | Inicio (pendientes, recordatorio, batería 15 %) | Normal | 26 | 131 | 48 | 8 | 0 |
| P-01 | Inicio con borrador sin terminar | Normal | 26 | 122 | 48 | 8 | 0 |
| P-01 | Recuperación de borrador (ventana) | Normal | 2 | 134 | 64 | 12 | 0 |
| P-02 | Casos: filtro de fechas | Normal | 27 | 120 | 48 | 8 | 0 |
| P-02 | Casos: lista | Normal | 31 | 109 | 48 | 8 | 0 |
| P-03 | Caso nuevo · Duplicado | Normal | 3 | 48 | 48 | 12 | 0 |
| P-03 | Caso nuevo · Paso 1 | Normal | 28 | 48 | 48 | 8 | 0 |
| P-03 | Caso nuevo · Paso 2 | Normal | 45 | 48 | 48 | 8 | 0 |
| P-03 | Caso nuevo · Paso 3 | Normal | 14 | 127 | 48 | 8 | 0 |
| P-03 | Caso: edición con Modificado | Normal | 27 | 48 | 48 | 8 | 0 |
| P-04 | Caso: detalle | Normal | 12 | 131 | 48 | 8 | 0 |
| P-04 | Caso: registrar avance | Normal | 14 | 48 | 48 | 8 | 0 |
| P-05 | Actuaciones: lista | Normal | 22 | 131 | 48 | 8 | 0 |
| P-06 | Actuación nueva · Paso 1 | Normal | 24 | 48 | 48 | 8 | 0 |
| P-06 | Actuación nueva · Paso 2 | Normal | 28 | 48 | 48 | 8 | 0 |
| P-06 | Actuación nueva · Paso 3 (Concluida) | Normal | 24 | 48 | 48 | 8 | 0 |
| P-06 | Actuación: detalle | Normal | 12 | 131 | 48 | 8 | 0 |
| P-07 | Agenda: búsqueda | Normal | 32 | 48 | 48 | 8 | 0 |
| P-07 | Agenda: Día | Normal | 24 | 48 | 48 | 8 | 0 |
| P-07 | Agenda: Mes | Normal | 57 | 48 | 48 | 8 | 0 |
| P-07 | Agenda: Semana | Normal | 37 | 48 | 48 | 8 | 0 |
| P-08 | Actividad nueva | Normal | 39 | 59 | 48 | 8 | 0 |
| P-08 | Actividad: cruce de horario | Normal | 3 | 48 | 48 | 12 | 0 |
| P-08 | Actividad: detalle | Normal | 17 | 131 | 48 | 8 | 0 |
| P-09 | Envío: conflicto y [Ver y cambiar] | Normal | 5 | 48 | 48 | 12 | 0 |
| P-09 | Envío: error | Normal | 12 | 131 | 48 | 8 | 0 |
| P-09 | Envío: fallo parcial | Normal | 12 | 131 | 48 | 8 | 0 |
| P-09 | Envío: pendientes | Normal | 12 | 131 | 48 | 8 | 0 |
| P-09 | Envío: progreso | Normal | 10 | 131 | 48 | 8 | 0 |
| P-10 | Computadora | Normal | 36 | 167 | 50 | 8 | 0 |
| P-10 | Computadora: editar | Normal | 7 | 48 | 48 | 8 | 0 |
| Global | Menú: tamaño de letra | Grande | 5 | 48 | 48 | 8 | 0 |
| P-00 | ¿Olvidó su PIN? | Grande | 3 | 113 | 50 | — | 0 |
| P-00 | PIN | Grande | 12 | 96 | 48 | 12 | 0 |
| P-00b | Ayuda | Grande | 14 | 97 | 48 | 8 | 0 |
| P-00b | Introducción | Grande | 2 | 110 | 64 | — | 0 |
| P-01 | Inicio (pendientes, recordatorio, batería 15 %) | Grande | 26 | 146 | 48 | 8 | 0 |
| P-01 | Inicio con borrador sin terminar | Grande | 26 | 122 | 48 | 8 | 0 |
| P-01 | Recuperación de borrador (ventana) | Grande | 2 | 134 | 64 | 12 | 0 |
| P-02 | Casos: filtro de fechas | Grande | 27 | 134 | 48 | 8 | 0 |
| P-02 | Casos: lista | Grande | 31 | 121 | 48 | 8 | 0 |
| P-03 | Caso nuevo · Duplicado | Grande | 3 | 48 | 48 | 12 | 0 |
| P-03 | Caso nuevo · Paso 1 | Grande | 28 | 48 | 48 | 8 | 0 |
| P-03 | Caso nuevo · Paso 2 | Grande | 45 | 48 | 48 | 8 | 0 |
| P-03 | Caso nuevo · Paso 3 | Grande | 14 | 135 | 48 | 8 | 0 |
| P-03 | Caso: edición con Modificado | Grande | 27 | 48 | 48 | 8 | 0 |
| P-04 | Caso: detalle | Grande | 12 | 131 | 48 | 8 | 0 |
| P-04 | Caso: registrar avance | Grande | 14 | 48 | 48 | 8 | 0 |
| P-05 | Actuaciones: lista | Grande | 22 | 146 | 48 | 8 | 0 |
| P-06 | Actuación nueva · Paso 1 | Grande | 24 | 48 | 48 | 8 | 0 |
| P-06 | Actuación nueva · Paso 2 | Grande | 28 | 48 | 48 | 8 | 0 |
| P-06 | Actuación nueva · Paso 3 (Concluida) | Grande | 24 | 48 | 48 | 8 | 0 |
| P-06 | Actuación: detalle | Grande | 12 | 131 | 48 | 8 | 0 |
| P-07 | Agenda: búsqueda | Grande | 32 | 48 | 48 | 8 | 0 |
| P-07 | Agenda: Día | Grande | 24 | 48 | 48 | 8 | 0 |
| P-07 | Agenda: Mes | Grande | 57 | 48 | 48 | 8 | 0 |
| P-07 | Agenda: Semana | Grande | 37 | 48 | 48 | 8 | 0 |
| P-08 | Actividad nueva | Grande | 39 | 63 | 48 | 8 | 0 |
| P-08 | Actividad: cruce de horario | Grande | 3 | 48 | 48 | 12 | 0 |
| P-08 | Actividad: detalle | Grande | 17 | 131 | 48 | 8 | 0 |
| P-09 | Envío: conflicto y [Ver y cambiar] | Grande | 5 | 48 | 48 | 12 | 0 |
| P-09 | Envío: error | Grande | 12 | 146 | 48 | 8 | 0 |
| P-09 | Envío: fallo parcial | Grande | 12 | 146 | 48 | 8 | 0 |
| P-09 | Envío: pendientes | Grande | 12 | 146 | 48 | 8 | 0 |
| P-09 | Envío: progreso | Grande | 10 | 146 | 48 | 8 | 0 |
| P-10 | Computadora | Grande | 36 | 187 | 53 | 8 | 0 |
| P-10 | Computadora: editar | Grande | 7 | 48 | 48 | 8 | 0 |
