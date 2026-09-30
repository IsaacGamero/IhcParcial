# Justicia Cercana: prototipo web para jueces de paz

## 1. Carátula

| | |
| :--- | :--- |
| Curso | CS2H01 Interacción Humano-Computador (UTEC, 2026-2), Examen Parcial |
| Integrantes | Sebastian Antonio Hernandez Miñano, Andre Contreras Valera, Isaac Percy Gamero del Aguila |
| Título | Justicia Cercana: cuaderno digital del juez de paz para tableta de 10" que funciona sin Internet |
| Enlace del prototipo | **`https://isaacgamero.github.io/IhcParcial/`** |
| Enlace de demostración | `https://isaacgamero.github.io/IhcParcial/?reset=1&today=2026-05-12` |
| Código QR | _[insertar aquí la imagen del QR generada a partir del enlace de demostración definitivo, por ejemplo `docs/qr-github-pages.png`, de unos 4×4 cm]_ |

### Instrucciones de uso

- **PIN:** `1234`. Se pide en cada sesión nueva del navegador. La primera vez después del PIN aparece la introducción de 3 pantallas (se puede tocar [Saltar]).
- **Restablecer datos:** abrir el enlace con `?reset=1`. Carga de nuevo los datos semilla (ficticios) y el parámetro se quita solo de la dirección, para que una recarga no borre lo registrado.
- **Fecha de la demostración:** los datos semilla están pensados para el **martes 12/05/2026**. Hay que abrir con `?today=2026-05-12`; si no, "hoy" es la fecha real del equipo y los casos "que requieren atención" y la agenda no coinciden con las capturas.
- **Probar sin Internet:**
  1. Abrir el enlace publicado una vez con Internet (así el service worker guarda la aplicación).
  2. En Chrome, DevTools › pestaña Network › **Offline** (o modo avión). La barra cambia a "Sin Internet · puede seguir trabajando" (gris) y sale el aviso "Se perdió el Internet. Lo que escribe se sigue guardando en la tableta."
  3. Registrar un caso, una actuación o una actividad: el contador pasa a "N registros por enviar" (ámbar) y cada registro muestra "En la tableta".
  4. Recargar la página sin Internet: la aplicación carga igual y los datos siguen ahí.
  5. Volver a poner **No throttling** (conexión normal): el envío empieza solo y muestra "Enviando 2 de 4…".
  - Con `npm run dev` no hay service worker; para probar la carga sin Internet en local hay que usar `npm run build` y `npm run preview`.
  - `?net=offline` fuerza el estado "Sin Internet" en la interfaz sin cortar la red (sirve para capturas, pero no provoca el envío automático al volver).
- **Resultados de envío:** `?scenario=sync-ok` (por defecto), `sync-partial`, `sync-error` o `conflict`.
- **Vista de computadora (P-10):** abrir en una ventana de 1400 px de ancho o más, o agregar `&device=pc&pin=skip`.
- **Modo anotado:** `?annotate=1` muestra los números de la matriz de justificación (sección 9) sobre cada elemento.

### Revisión en Chrome DevTools

El prototipo se revisa con **Toggle device toolbar** (DevTools, `Ctrl+Shift+M`) usando dos dispositivos personalizados con las mismas medidas que las capturas (detalle en `docs/DISPOSITIVO_CHROME.md`):

| Dispositivo | Ancho × alto | DPR | Tipo | Pantallas |
| :--- | :--- | :--- | :--- | :--- |
| Tableta 10" Justicia Cercana (1280x800) | 1280 × 800, horizontal | 2 | Mobile, táctil | P-00 a P-09 |
| Computadora P-10 (1440x900) | 1440 × 900 | 1 | Desktop, sin táctil | P-10 |

Con el servidor de desarrollo en marcha (`npm run dev`), `npm run tablet` abre Chrome con DevTools y la tableta ya seleccionada; `npm run tablet:pc` hace lo mismo con la computadora. Si se rota la tableta a vertical aparece "Gire la tableta para usarla de lado".

---

## 2. Resumen del caso y del usuario

**Caso.** Los jueces de paz de comunidades rurales atienden conflictos (sobre todo por conciliación) y actuaciones notariales, y organizan audiencias, reuniones y visitas. Hoy lo registran en cuadernos, formularios impresos o archivos separados, lo que produce duplicados, registros difíciles de encontrar y fechas olvidadas. Trabajan con una tableta de 10" y con conexión intermitente: pueden pasar horas sin Internet y envían la información desde la sede del Poder Judicial o desde una computadora con Internet en la comunidad.

**Usuaria.** Una jueza de paz con poca experiencia en aplicaciones digitales, que atiende a personas en persona (muchas veces con la tableta apoyada en una mesa y mostrando la pantalla a las partes), en espacios con luz exterior, con energía limitada y, a menudo, en un entorno donde se habla quechua o aimara.

**Necesidades que guían el diseño**

| Necesidad | Respuesta del prototipo |
| :--- | :--- |
| Registrar sin Internet y sin miedo a perder datos | Todo se guarda en la tableta, con guardado automático y confirmación que dice "guardado en la tableta" |
| Saber qué falta enviar | Barra de estado fija con conexión, registros por enviar y último envío; distintivo por registro |
| Encontrar un registro anterior | Búsqueda por nombre o DNI y filtros visibles en casos y actuaciones; búsqueda por título, comunidad o persona en la agenda |
| No olvidar fechas | "Casos que requieren atención" con el motivo en texto, aviso "Mañana: N actividades", próxima cita que se agenda sola |
| Evitar duplicados y registros incompletos | Advertencia de persona o trámite parecido; Borrador / Completo con "falta: …" |
| Entender el formulario | Lenguaje cotidiano, término legal solo en gris, "(opcional)" en texto, formularios en 3 pasos |

---

## 3. Modelo conceptual y estrategia sin conexión

### Modelo conceptual

La aplicación es el **cuaderno de registro** que la jueza ya usa, con cuatro secciones fijas en el menú lateral: **Inicio**, **Casos**, **Actuaciones** y **Agenda**. Lo que escribe se guarda primero en la tableta ("Guardado en la tableta") y después se envía al Poder Judicial ("Enviar al Poder Judicial"). La interfaz nunca usa "sincronizar", "modo local", "offline" ni "servidor".

### Barra de estado (fija arriba en todas las pantallas de la tableta)

| Indicador | Estado | Ícono | Texto |
| :--- | :--- | :--- | :--- |
| Conexión | Con Internet | wifi (azul) | "Con Internet" |
| Conexión | Sin Internet | wifi-off (gris) | "Sin Internet · puede seguir trabajando" |
| Datos | Nada pendiente | cloud-check (verde) | "Todo enviado" |
| Datos | Pendientes | cloud-upload (ámbar) | "3 registros por enviar" |
| Último envío | — | clock | "Último envío: 11/05, 18:40" |

Con Internet y registros pendientes aparece el botón visible **[Enviar ahora]**. Tocar cualquier indicador también abre P-09, pero nunca es la única vía. "Sin Internet" es gris, no rojo: es el estado normal en campo.

### Semántica de colores (una sola para toda la aplicación; el color siempre va con ícono y texto)

| Color | Significado | Ejemplos |
| :--- | :--- | :--- |
| Azul | Información neutra, acción principal | [Guardar], "Con Internet" |
| Gris | Normal sin alerta o inactivo | "Sin Internet", actividad cancelada (tachada) |
| Ámbar | Falta enviar o requiere atención pronto | "3 registros por enviar", "En la tableta", "Cita hoy" |
| Verde | Enviado o terminado | "Todo enviado", "Enviado", caso Concluido |
| Rojo | Error que pide una acción | error de validación, "Cita vencida", "Revisar", error del envío |

### Distintivo por registro

Cada fila y cada detalle de casos, actuaciones y actividades muestra: `tablet` ámbar "En la tableta", `cloud-check` verde "Enviado" o `alert-triangle` rojo "Revisar". Guardar o editar un registro lo devuelve a "En la tableta" hasta que se envía. (En la vista Mes de la agenda las celdas solo muestran fichas compactas; el distintivo se ve en las vistas Semana y Día y en el detalle.)

### Confirmación de guardado

Siempre dice dónde quedó: "Caso JZ04-TAB01-202605-0013 guardado en la tableta. Se enviará cuando haya Internet.", con el distintivo ámbar "En la tableta" (no verde, para no confundirlo con "Enviado"). Al editar: "Se guardaron 2 cambios en la tableta: Estado, Observaciones."

### Guardado automático y recuperación

- Los formularios de caso, actuación y actividad se guardan solos al salir de cada campo y cada 3 s mientras hay cambios, con el texto discreto "Guardado automáticamente hace un momento".
- Al reabrir la aplicación con un formulario sin terminar: "Tenía un caso sin terminar (Juan Quispe, 12/05). ¿Desea continuar?" [Continuar] [Descartar]; Descartar pide confirmación ("¿Descartar lo que escribió? No se podrá recuperar."). Inicio también muestra el aviso con los mismos botones.
- Si hay pendientes y pasaron 3 días o más desde el último envío, Inicio muestra: "Lleva 5 días sin enviar sus registros. Si la tableta se pierde o daña, lo no enviado se perdería. Envíelos cuando tenga Internet." (se ve con `?seed=mixed`).

### Borrador / Completo (la misma regla en los tres módulos)

El estado del registro es independiente del estado propio (En trámite, Pendiente, Programada…). Siempre se puede guardar; si faltan mínimos queda como Borrador y la lista lo marca con "Borrador · falta: personas". P-02, P-05 y P-07 tienen la casilla "Mostrar solo borradores".

| Registro | Mínimos para "Completo" (implementado en `src/lib/domain.ts`) |
| :--- | :--- |
| Caso | tipo (y descripción de "Otro"), descripción, al menos un solicitante con sus datos obligatorios válidos, acuerdo si está Concluido |
| Actuación | tipo, asunto, al menos un solicitante válido, fecha de atención si está Atendida o Concluida, resultado y fecha de entrega si está Concluida |
| Actividad | título, tipo (categoría), fecha y lugar (el estado siempre tiene valor) |

Los borradores también se envían al Poder Judicial, para no perder datos.

### Códigos generados en la tableta

Se generan sin conexión con prefijo de juzgado y de tableta, para que no choquen con los de otras tabletas ni con la web. El código es definitivo desde que se guarda.

| Registro | Formato | Ejemplo |
| :--- | :--- | :--- |
| Caso | `JZ[juzgado]-TAB[tableta]-[AAAAMM]-[correlativo]` | `JZ04-TAB01-202605-0013` |
| Actuación | `NOT-TAB[tableta]-[AAAAMM]-[correlativo]` | `NOT-TAB01-202605-0007` |
| Actividad | `AGE-TAB[tableta]-[AAAAMM]-[correlativo]` | `AGE-TAB01-202605-0019` |

### Otros apoyos transversales

- **Dictado:** no hay botón de micrófono propio (la Web Speech API depende de un servicio en línea en la mayoría de navegadores). Cada texto largo muestra "Puede hablar en vez de escribir: toque el micrófono del teclado." La tableta se configura con Gboard y el paquete de español descargado, que dicta sin Internet (configuración del dispositivo, no del prototipo).
- **Batería baja:** al 20 % o menos, aviso ámbar "Batería baja (18 %). Lo que registró ya está guardado en la tableta." y al 10 % o menos el mismo aviso en rojo y más grande; incluye [Enviar ahora] si hay Internet y pendientes. Usa la Battery Status API donde existe; en la demostración, `?battery=18` o `?battery=9`.
- **Tamaño de letra:** "Letra" en el menú y "Tamaño de letra" en Ayuda: [Normal] [Grande] [Muy grande] (18, 21 y 24 px de base). Se recuerda en la tableta.
- **Orientación:** solo horizontal. Instalada, el manifiesto fija `orientation: landscape`; en el navegador, en vertical se muestra "Gire la tableta para usarla de lado".
- **Bloqueo:** botón [Bloquear] en el menú y bloqueo automático tras 5 minutos sin uso.

### Glosario de equivalencias con el enunciado

Vocabulario de la interfaz (cotidiano) frente a los términos del enunciado, para ubicar cada requisito:

| En la interfaz | En el enunciado |
| :--- | :--- |
| "Guardado en la tableta", distintivo "En la tableta" | Almacenado localmente |
| "N registros por enviar" | Sincronización pendiente |
| "Enviar al Poder Judicial", [Enviar ahora] | Sincronizar |
| "Enviado", "Todo enviado", "Se enviaron los 4 registros. Todo está guardado en el Poder Judicial." | Confirmar que la sincronización se completó correctamente |
| "Sin Internet · puede seguir trabajando" | Trabajo sin conexión a Internet |
| Actuaciones / trámite | Actuaciones notariales |
| "Casos que requieren atención" | Reconocer qué casos requieren atención |
| "Registrar avance" | Actualizar el avance del caso / seguimiento |
| Agenda, actividad | Agenda o calendario, actividad |
| Rol (caso) / Participación (actuación) | Rol en el caso / participación en la actuación |

---

## 4. Módulo 1: Casos (P-02, P-03, P-04)

Capturas: `captures/P-02_casos-lista.png`, `captures/P-03_caso-paso1.png`, `captures/P-03_caso-paso2.png`, `captures/P-03_caso-paso3-resumen.png`, `captures/P-04_caso-detalle.png`, `captures/FA-03_registrar-avance-acuerdo.png`, `captures/FA-04_campos-modificado.png` (nombres previstos; ver sección 8).

**P-02 Lista y búsqueda.** Un solo campo "Nombre o DNI" (también encuentra por código), filtros visibles como botones: Estado (En trámite / En conciliación / Concluido), [Comunidad] y [Fechas], casilla "Mostrar solo borradores" y [Quitar filtros]. Cada fila muestra partes, código, tipo de conflicto, estado (ícono + texto), motivo de atención, "Borrador · falta: …" y distintivo. Orden: primero Cita vencida, luego Cita hoy, luego días sin avance; después, por fecha. [Nuevo caso] abajo a la derecha.

**P-03 Nuevo caso (3 pasos).** Paso 1 "El problema", Paso 2 "Las personas" (dos personas vacías sugeridas, [Agregar persona], [Quitar]), Paso 3 "Próxima cita y guardar" con resumen legible para leerlo a las partes. [Siguiente] valida el paso y muestra el mensaje junto al campo; [Guardar caso] está en los tres pasos y guarda aunque falten datos (queda Borrador). Solo se bloquean datos imposibles: fecha de registro futura o próxima cita pasada. Si hay próxima fecha, al guardar se crea una actividad "Audiencia de conciliación" vinculada y se avisa "También se agendó: Audiencia, 19/05, 10:00".

**P-04 Detalle.** Cabecera con código, estado, distintivo, motivo de atención y marca de borrador; personas con su rol; próxima cita; resultado o acuerdo; observaciones; historial cronológico de avances; evidencias; actividades vinculadas de la agenda. Botones [Registrar avance] (principal, abajo a la derecha) y [Editar datos]. La edición reutiliza el formulario de 3 pasos: cada campo cambiado se resalta con borde y la etiqueta "Modificado", [Deshacer cambios] vuelve a los valores guardados y la confirmación nombra los campos ("Se guardó 1 cambio en la tableta: Observaciones.").

### Campos del caso (P-03)

| Campo | Obligatoriedad | Control | Validación | Mensaje |
| :--- | :--- | :--- | :--- | :--- |
| Código | Automático | Texto solo lectura | Formato `JZ04-TAB01-AAAAMM-NNNN` | — |
| Fecha de registro | Obligatorio, prellenado con hoy, editable | Fecha | No posterior a hoy (bloquea al guardar) | "La fecha no puede ser posterior a hoy." |
| Tipo de conflicto | Obligatorio | 6 botones grandes (catálogo 5.1) | Elegir uno | "Elija de qué trata el problema." |
| ¿De qué trata? | Condicional: "Se pide porque eligió Otro" | Texto | No vacío | "Escriba de qué trata." |
| Descripción del motivo | Obligatorio | Texto amplio + ayuda de dictado | No vacío | "Cuente brevemente qué pasó." |
| Estado | Obligatorio, prellenado "En trámite" | Botones segmentados | — | — |
| Resultado o acuerdo | Condicional: "Se pide cuando el caso está Concluido" | Texto amplio | No vacío si está Concluido | "Para cerrar el caso, escriba el acuerdo o resultado." |
| Observaciones | Opcional | Texto amplio | — | — |
| Próxima fecha de atención (paso 3) | Opcional | Fecha + hora | No anterior a hoy (bloquea al guardar); crea actividad en la agenda | "La próxima cita no puede ser en una fecha pasada." |

La fecha de registro es editable porque el reloj de una tableta sin conexión puede estar desfasado.

### Campos de cada parte (P-03; el mismo editor sirve para P-06)

| Campo | Obligatoriedad | Control | Validación | Mensaje |
| :--- | :--- | :--- | :--- | :--- |
| Rol | Obligatorio | Botones: Solicitante / Invitado / Testigo | Elegir uno; al menos un solicitante por caso | "Elija qué papel tiene esta persona." / "El caso necesita al menos una persona que lo solicite." |
| Nombres y apellidos | Obligatorio | Texto | Al menos nombre y un apellido | "Escriba el nombre y al menos un apellido." |
| Comunidad o localidad | Obligatorio | Texto con sugerencias de comunidades frecuentes | No vacío | "Indique la comunidad donde vive." |
| Documento (tipo) | Opcional | Botones: DNI / Carné de extranjería / Otro / No tiene / No lo tiene a la mano | — | — |
| Número de documento | Condicional: "Se pide porque eligió un tipo de documento" (DNI, Carné u Otro) | Teclado numérico | DNI: 8 números; Carné u Otro: no vacío | "El DNI tiene 8 números. Revíselo o elija 'No lo tiene a la mano'." / "Escriba el número del documento." |
| Teléfono o contacto | Opcional, con casilla "No tiene" | Teclado numérico | Si se escribe: celular de 9 números que empieza en 9 | "El celular tiene 9 números." |
| Dirección o referencia | Opcional | Texto | — | — |

La comunidad es obligatoria (y la dirección no) porque se usa para buscar y para detectar duplicados, y casi siempre se conoce.

**Duplicados de personas (regla 5.3).** Al salir del nombre, del número de documento o de la comunidad, se compara con las personas de casos y actuaciones de la tableta: mismo DNI, o nombre parecido (al menos dos palabras en común) en la misma comunidad. Advierte sin bloquear: "¿Es la misma persona?", "Ya está registrada en Trámite NOT-TAB01-202604-0003:" con sus datos, y los botones [Es otra persona: continuar] [Es la misma persona: usar sus datos]. Sin Internet solo se detectan duplicados dentro de la tableta.

### Registrar avance (ventana sobre P-04)

| Campo | Obligatoriedad | Control | Validación | Mensaje |
| :--- | :--- | :--- | :--- | :--- |
| Fecha del avance | Obligatorio, prellenado con hoy | Fecha | No posterior a hoy | "La fecha no puede ser posterior a hoy." |
| Qué se hizo | Obligatorio | Texto amplio + ayuda de dictado | No vacío | "Cuente qué se hizo hoy en el caso." |
| Nuevo estado | Opcional (mantiene el actual) | Botones segmentados | — | — |
| Resultado o acuerdo | Condicional: "Se pide cuando el caso pasa a Concluido" | Texto amplio | No vacío | "Para cerrar el caso, escriba el acuerdo o resultado." |
| Próxima fecha de atención | Opcional | Fecha + hora | No anterior a hoy; crea actividad en la agenda | "La próxima cita no puede ser en una fecha pasada." |
| Evidencias | Opcional | [Tomar foto] (cámara de la tableta, foto reducida a 320 px) y referencia física ("Acta en cuaderno 3, folio 12") | — | — |

Al guardar: "Avance guardado en la tableta. Se enviará cuando haya Internet."

### Criterios de "Requiere atención"

Se calculan en la tableta (`attentionReason` en `src/lib/domain.ts`) y se muestran en texto e ícono en P-02, P-04 e Inicio. No aplican a casos Concluidos.

| Motivo en pantalla | Regla | Color |
| :--- | :--- | :--- |
| "Cita vencida" | La próxima cita ya pasó y no hay un avance registrado desde esa fecha | Rojo |
| "Cita hoy" | La próxima cita es hoy | Ámbar |
| "18 días sin avance" | 15 días o más desde el último avance (o desde el registro si no hay avances), en estado En trámite o En conciliación | Ámbar |

El umbral de 15 días (dos semanas) es un valor de diseño: deja pasar el intervalo habitual entre dos citas sin marcar el caso, pero evita que un conflicto quede olvidado un mes. Se guarda como dato configurable (`attentionDays`), aunque en el prototipo no hay pantalla para cambiarlo. Debe validarse con jueces de paz (sección 13).

### Justificación del estado "En conciliación"

El enunciado pide "en trámite, concluido u otro estado que el equipo justifique". Se agrega **En conciliación** porque la Ley 29824, Ley de Justicia de Paz, plantea la conciliación como la vía principal con la que el juez de paz resuelve los conflictos (solo decide si las partes no llegan a un acuerdo). Distinguir los casos en los que ya hay diálogo entre las partes de los que recién se registraron ayuda a la jueza a preparar las audiencias y a priorizar. _Verificación pendiente antes de entregar: citar el artículo exacto de la Ley 29824 que define la función conciliadora y confirmar el término._

---

## 5. Módulo 2: Actuaciones (P-05, P-06)

Capturas: `captures/P-05_actuaciones-lista.png`, `captures/F2-01_tipo-tramite.png`, `captures/F2-02_solicitante.png`, `captures/F2-04_error-concluida-sin-resultado.png`, `captures/F2-06_confirmacion-guardado.png`, `captures/P-06_detalle-actuacion.png` (nombres previstos).

**P-05 Lista y búsqueda.** Búsqueda "Nombre o DNI"; filtros visibles con listas: Comunidad, Tipo de actuación, Estado de atención, Desde y Hasta; casilla "Mostrar solo borradores". Cada fila: código y fecha de solicitud, tipo en lenguaje cotidiano, solicitante, "Borrador · falta: …", estado de atención (ícono + texto) y distintivo. [Nueva actuación] abajo a la derecha.

**P-06 Nueva actuación (3 pasos).** Paso 1 "¿Qué trámite?": se muestran primero **4 tarjetas** con la etiqueta cotidiana y el término legal en gris, y [Ver más trámites] muestra el resto (con tarjetas descriptivas el problema real es la carga de lectura). Paso 2 "Las personas": participantes. Paso 3 "Resultado": estado, fechas, resultado, observaciones y documentos. [Guardar como borrador] está en los tres pasos; [Guardar] (paso 3) revisa los tres pasos y lleva al primero que tenga un error. La cabecera muestra siempre el código y el estado del registro ("Borrador · falta: personas" o "Completo").

**Dos dimensiones separadas:**

- **Estado de atención** (exigido por el enunciado): Pendiente = "la persona lo pidió, aún no se atiende"; Atendida = "ya se atendió, falta entregar"; Concluida = "ya se entregó". La explicación va dentro de cada botón.
- **Estado del registro:** Borrador / Completo, con la misma regla que los otros módulos.

### Campos de la actuación

| Campo | Obligatoriedad | Control | Validación | Mensaje |
| :--- | :--- | :--- | :--- | :--- |
| Código | Automático | Solo lectura | Formato `NOT-TAB01-AAAAMM-NNNN` | — |
| Tipo de actuación | Obligatorio | Tarjetas con descripción (catálogo 5.2) | Elegir uno | "Elija qué trámite le piden." |
| ¿Cuál trámite? | Condicional: "Se pide porque eligió Otra" | Texto | No vacío | "Escriba qué trámite es." |
| Asunto | Obligatorio | Texto amplio + ayuda de dictado | No vacío | "Cuente en pocas palabras qué necesita la persona." |
| Fecha de solicitud | Obligatorio, prellenado con hoy | Fecha | No vacía; no posterior a hoy | "Indique la fecha de solicitud." / "La fecha de solicitud no puede ser posterior a hoy." |
| Participantes | Al menos uno (el primero viene como Solicitante) | Editor de personas (tabla de P-03) con **Participación**: Solicitante / Declarante / Testigo | Al menos un solicitante con datos válidos | "El trámite necesita al menos una persona que lo solicite." |
| Estado de atención | Obligatorio, prellenado "Pendiente" | Botones segmentados con explicación | — | — |
| Fecha de atención | Condicional: "Se pide cuando el trámite está Atendido o Concluido" (se prellena con hoy al cambiar el estado) | Fecha | No vacía; igual o posterior a la solicitud; no posterior a hoy | "Indique la fecha de atención." / "La atención no puede ser antes de la solicitud." / "La fecha de atención no puede ser posterior a hoy." |
| Resultado | Condicional: "Se pide cuando el trámite está Concluido" | Texto amplio + ayuda de dictado | No vacío (el mensaje aparece apenas se toca Concluida sin resultado) | "Para concluir, escriba qué se entregó o qué constancia se emitió." |
| Fecha de entrega | Condicional: "Se pide cuando el trámite está Concluido" | Fecha | No vacía; igual o posterior a la atención | "Indique la fecha de entrega." / "La entrega no puede ser antes de la atención." |
| Observaciones | Opcional | Texto amplio | — | — |
| Documentos | Opcional | [Tomar foto] (reducida a 640 px) y referencia a documento físico con [Agregar] | — | — |

**Duplicados.** Personas: misma regla que en casos. Trámite: al guardar (también como borrador) se busca otro con el mismo tipo, fecha de solicitud dentro de 7 días y el mismo solicitante (DNI o nombre parecido). Advierte sin bloquear: "¿Es el mismo trámite?", "Ya hay un trámite parecido en la tableta:" con código, tipo, solicitante, fecha y estado; [Es el mismo: ver el anterior] [Es otro trámite: guardar].

**Edición.** Desde el detalle, [Editar] abre el mismo formulario: campos cambiados con "Modificado" y confirmación "Se guardaron N cambios en la tableta: …". y [Deshacer cambios], igual que en casos.

### Catálogo de actuaciones notariales

Etiqueta cotidiana visible y término legal en gris. Los 4 primeros aparecen de entrada; el resto con [Ver más trámites].

| Etiqueta en la tarjeta | Término legal | Correspondencia prevista en la Ley 29824 |
| :--- | :--- | :--- |
| Certificar una firma | Legalización de firma | Competencia notarial: certificar firmas |
| Certificar una copia de documento | Copia certificada | Competencia notarial: certificar copias de documentos |
| Constancia de que vive en un lugar | Constancia domiciliaria | Competencia notarial: otorgar constancias |
| Constancia de que ocupa un terreno | Constancia de posesión | Competencia notarial: otorgar constancias |
| Constancia de que una persona sigue con vida | Constancia de supervivencia | Competencia notarial: otorgar constancias |
| Constancia de que viven juntos | Constancia de convivencia | Competencia notarial: otorgar constancias |
| Documento de venta o traspaso de un bien | Transferencia de bienes | Competencia notarial: transferencia de bienes, dentro de los montos que fija la ley |
| Otra (escribir cuál) | — | Cualquier otra función notarial prevista en la ley |

_Nota de verificación (pendiente antes de entregar):_ contrastar cada fila con el artículo de competencia notarial de la Ley 29824 (texto oficial en El Peruano o en el portal del Poder Judicial), anotar el número de artículo e inciso, confirmar los límites de monto de las transferencias y retirar cualquier trámite que no figure en la ley. Funciones como dar fe de acuerdos de asamblea comunal o los protestos no tienen tarjeta propia y se registran con "Otra".

---

## 6. Módulo 3: Agenda (P-07, P-08)

Capturas: `captures/P-07_agenda-mes.png`, `captures/F3-02_agenda-semana.png`, `captures/F3-03_agenda-dia.png`, `captures/F3-04_detalle-actividad.png`, `captures/F4-01_nueva-actividad.png`, `captures/F4-02_cruce-horario.png` (nombres previstos).

**Vistas.** Selector grande [Mes] [Semana] [Día], botón [Hoy] y flechas anterior / siguiente (sin gestos de deslizar). La vista Semana es la de entrada. En Mes, cada día muestra hasta 3 actividades y "+N más"; tocar el día abre la vista Día. En Semana, tocar la cabecera del día abre el Día y tocar una actividad abre su detalle.

**Categorías** con color + ícono + texto: Audiencia (`gavel`), Reunión (`users`), Visita a comunidad (`map-pin`), Otra (`calendar`). **Estados** con ícono + texto: Programada (`clock`), Realizada (`check-circle`), Cancelada (`x-circle`, texto tachado en gris).

**Búsqueda y filtros.** Campo "Título, comunidad o persona" (incluye las personas del caso o trámite vinculado), listas de tipo y estado y casilla "Mostrar solo borradores". Con búsqueda o con la casilla activa, la agenda pasa a una lista de resultados con fecha.

**Tareas próximas.** Franja superior "Mañana: 2 actividades" que abre el día siguiente; en Inicio, "Hoy" y "Próximos 7 días" con el aviso destacado "Mañana: 2 actividades" y líneas como "Mañana 9:00 · Audiencia · Caso JZ04-TAB01-202605-0011". Los recordatorios se muestran dentro de la aplicación (no se usa la API de notificaciones del navegador).

**Detalle de actividad.** Fecha (enlace al día), hora, lugar, descripción, vínculo ("Creada desde el caso JZ04-…" con enlace al caso, o enlace al trámite), personas, recordatorio, código, distintivo y cambio rápido de estado con botones (confirma "Actividad guardada en la tableta").

**Integración con casos.** La próxima fecha de atención de un caso (al crearlo, al editarlo o al registrar un avance) crea una actividad "Audiencia de conciliación" vinculada, con recordatorio "1 día antes" y las personas del caso. El detalle del caso lista sus actividades.

### Campos de la actividad (P-08, una sola pantalla en dos columnas)

| Campo | Obligatoriedad | Control | Validación | Mensaje |
| :--- | :--- | :--- | :--- | :--- |
| Título | Obligatorio | Texto con sugerencias ("Audiencia de conciliación", "Reunión con autoridades comunales", "Visita a Huayllay"…) | No vacío | "Escriba un nombre para la actividad." |
| Tipo de actividad | Obligatorio | 4 botones con ícono y color | Elegir uno | "Elija el tipo de actividad." |
| Fecha | Obligatorio (prellenada con hoy o con el día abierto) | Fecha | No vacía; si es pasada y está Programada, aviso no bloqueante | "Elija la fecha." / "Está agendando en una fecha que ya pasó. ¿Es correcto?" |
| Hora de inicio | Opcional, con casilla "Sin hora fija" | Hora | — | — |
| Hora de término | Condicional: "Se pide cuando hay hora de inicio" (inactiva hasta que haya hora de inicio) | Hora | Posterior a la de inicio (bloquea) | "La hora de término debe ser después de la de inicio." |
| Lugar o comunidad | Obligatorio | Botones con las comunidades frecuentes + "Otro lugar" (texto) | No vacío | "Indique dónde será." |
| Estado | Obligatorio, prellenado "Programada" | Botones con ícono | "Realizada" en fecha futura: aviso no bloqueante | "Marcó como realizada una actividad que aún no ocurre. ¿Es correcto?" |
| Descripción o motivo | Opcional | Texto amplio + ayuda de dictado | — | — |
| Vínculo con caso o trámite | Opcional | Búsqueda por código o nombre | — | — |
| Recordatorio | Opcional, prellenado "1 día antes" | Botones: No / El mismo día / 1 día antes | — | — |

Al tocar [Guardar actividad] con datos mínimos faltantes aparece "Faltan datos · Falta: lugar." con [Guardar como borrador] [Completar ahora]. **Cruce de horario:** si otra actividad no cancelada del mismo día se superpone, aviso no bloqueante "A esa hora ya tiene: Visita a Huayllay. ¿Agendar igual?" con [Cambiar la hora] (lleva a la hora de inicio) y [Agendar igual]. [Cancelar] con cambios pregunta "¿Salir sin guardar?".

---

## 7. Envío y computadora (P-09, P-10)

Capturas: `captures/F4-04_progreso-envio.png`, `captures/F4-05_exito-envio.png`, `captures/F4-06a_fallo-parcial.png`, `captures/F4-06b_error-servidor.png`, `captures/F4-06c_conflicto.png`, `captures/F4-06d_ver-y-cambiar.png`, `captures/FB-01_pc-aviso-ultimo-envio.png`, `captures/FB-02_pc-editar-caso.png` (nombres previstos).

### P-09 Enviar al Poder Judicial

- **Envío automático.** Cuando la tableta recupera Internet y hay registros por enviar, el envío empieza solo. Si la jueza está en P-01, una lista o un detalle, se abre P-09; si está llenando un formulario, no se la saca de él y aparece el aviso "Enviando sus registros al Poder Judicial…" con [Ver]. También existe [Enviar ahora] en la barra, en P-09 y en el aviso de batería. Se elige el envío automático porque a una usuaria poco familiarizada se le puede olvidar hacerlo; el resultado siempre se confirma.
- **Desde cualquier lugar con Internet** (sede o comunidad): el envío no depende del lugar.
- **Progreso:** "Enviando 2 de 4…", barra con porcentaje y lista de registros con estado individual (En la tableta / Enviando / Enviado).
- **Si no hay Internet:** "Se enviarán cuando haya Internet." y la lista de lo que falta.

### Resultados posibles

| Resultado | Cómo se produce | Mensaje | Acción |
| :--- | :--- | :--- | :--- |
| Éxito total | `scenario=sync-ok` | "Se enviaron los 4 registros. Todo está guardado en el Poder Judicial." La barra pasa a "Todo enviado" y los distintivos a "Enviado" | — |
| Fallo parcial por corte | `scenario=sync-partial`, o cortar la red durante el envío | "Se enviaron 2 de 4. Se cortó el Internet. Los otros 2 siguen seguros en la tableta." | [Reintentar] |
| Error del Poder Judicial | `scenario=sync-error` | "El Poder Judicial no respondió. Sus 4 registros siguen seguros en la tableta. Intente más tarde." | [Reintentar] |
| Conflicto | `scenario=conflict`, o editar en P-10 un registro que la tableta también cambió | Mensaje de éxito + "Se usó la versión de la computadora del 12/05 en: Observaciones." | [Ver y cambiar] |

**Conflictos.** Se aplica automáticamente el cambio más reciente en cada campo (la edición de la computadora) y se informa en qué campo. [Ver y cambiar] abre la comparación por campo con dos tarjetas, "Tableta" y "Computadora, fecha", para elegir la versión; al guardar, el registro vuelve a enviarse. La versión descartada queda guardada en el historial interno del registro. Así no se exige una decisión campo por campo a una usuaria con poca experiencia digital, pero se deja la opción de revertir.

### P-10 Vista en computadora (1440×900)

Es la misma aplicación con diseño adaptado: se activa con una ventana de 1400 px o más de ancho (o `device=pc`). Muestra lo que **ya llegó** al Poder Judicial (JSON simulado), en tablas con más columnas (casos, actuaciones y agenda), fila resaltada al pasar el mouse y el texto "Haz clic en una fila para editarla." Permite editar el **estado** y las **observaciones** (en actividades, la descripción) de cada registro; esas ediciones originan el conflicto de P-09. El aviso superior dice solo lo que el Poder Judicial puede saber: "La tableta envió datos por última vez el 11/05 a las 18:40. Lo que registró después aún no aparece aquí." Nunca afirma cuántos registros tiene pendientes la tableta, y la barra de la computadora solo muestra la conexión.

---

## 8. Flujos de la situación de uso

Cada flujo empieza con datos restablecidos y la fecha congelada (`?reset=1&today=2026-05-12`). Las capturas las genera Playwright y se describen en el manifiesto `captures/captures.json` (pantalla, flujo y paso, qué demuestra y criterio de la rúbrica). **Al cerrar este informe el manifiesto aún no existía:** los nombres de archivo de abajo son los previstos y deben casarse con el manifiesto final (misma pantalla y paso).

### Flujo 1: Registrar un conflicto vecinal entre dos personas (con corte de Internet)

| Paso | Captura | Pantalla | Qué demuestra |
| :--- | :--- | :--- | :--- |
| 1 | `F1-01_pin.png`, `F1-01b_inicio-todo-enviado.png` | P-00, P-01 | PIN sin Internet; barra "Con Internet" · "Todo enviado" |
| 2 | `F1-02_caso-paso1.png` | P-03 | "Problemas entre vecinos" y descripción con ayuda de dictado |
| 3 | `F1-03_corte-internet.png` | P-03 | Corte real: aviso gris "Se perdió el Internet…" y barra "Sin Internet" |
| 4 | `F1-04_parte-solicitante.png` | P-03 | Juan Quispe Mamani, Solicitante, "No lo tiene a la mano", Huayllay |
| 5 | `F1-05_advertencia-duplicado.png` | P-03 | María Condori Huamán ya existe en un trámite: [Es la misma persona: usar sus datos] |
| 6 | `F1-06_error-validacion-rol.png` | P-03 | Sin rol en la Persona 2: "Elija qué papel tiene esta persona." |
| 7 | `F1-07_resumen-antes-de-guardar.png` | P-03 | Próxima cita 19/05 10:00 y resumen para leer a las partes |
| 8 | `F1-08_confirmacion-guardado.png` | P-04 | "Caso JZ04-TAB01-202605-0013 guardado en la tableta", "También se agendó: Audiencia, 19/05, 10:00"; barra "2 registros por enviar" |

### Flujo 2: Atender una actuación notarial (con cierre inesperado)

| Paso | Captura | Pantalla | Qué demuestra |
| :--- | :--- | :--- | :--- |
| 1 | `F2-01_tipo-tramite.png` | P-06 | 4 tarjetas + [Ver más trámites]; "Constancia de que ocupa un terreno" |
| 2 | `F2-02_solicitante.png` | P-06 | Solicitante sin duplicados |
| 3 | `F2-03_recuperacion-borrador.png` | Global | Tras recargar: "Tenía una actuación sin terminar… ¿Desea continuar?" |
| 4 | `F2-04_error-concluida-sin-resultado.png` | P-06 | Atendida con fecha de hoy; Concluida sin resultado muestra el mensaje condicional |
| 5 | `F2-05_completo.png` | P-06 | Resultado y fecha de entrega: el registro pasa de Borrador a Completo |
| 6 | `F2-06_confirmacion-guardado.png` | P-06 detalle | Guardado en la tableta; barra "3 registros por enviar" |

### Flujo 3: Revisar las actividades de la semana

| Paso | Captura | Pantalla | Qué demuestra |
| :--- | :--- | :--- | :--- |
| 1 | `F3-01_aviso-manana.png` | P-01 | "Mañana: 2 actividades" con hora, tipo y caso |
| 2 | `F3-02_agenda-semana.png` | P-07 | Categorías con color + ícono + texto y estados |
| 3 | `F3-03_agenda-dia.png`, `F3-04_detalle-actividad.png` | P-07 | Miércoles en vista Día y detalle con "Creada desde el caso…" |

### Flujo 4: Agendar una reunión y enviar todo

| Paso | Captura | Pantalla | Qué demuestra |
| :--- | :--- | :--- | :--- |
| 1 | `F4-01_nueva-actividad.png` | P-08 | "Reunión con autoridades comunales", Reunión, jueves 15:00–16:00, Huayllay |
| 2 | `F4-02_cruce-horario.png` | P-08 | "A esa hora ya tiene: Visita a Huayllay. ¿Agendar igual?" → [Cambiar la hora] |
| 3 | `F4-03_cuatro-por-enviar.png` | P-07 | Guardada; barra "4 registros por enviar" |
| 4 | `F4-04_progreso-envio.png` | P-09 | Vuelve Internet: envío automático "Enviando 2 de 4…" |
| 5 | `F4-05_exito-envio.png` | P-09 | "Se enviaron los 4 registros"; barra "Todo enviado" |
| 6 | `F4-06a_fallo-parcial.png`, `F4-06b_error-servidor.png`, `F4-06c_conflicto.png`, `F4-06d_ver-y-cambiar.png` | P-09 | Variantes por `scenario` |

### Flujo complementario A: Actualizar el avance de un caso

| Paso | Captura | Pantalla | Qué demuestra |
| :--- | :--- | :--- | :--- |
| 1 | `FA-01_busqueda-filtro.png` | P-02 | Búsqueda "Quispe" + filtro "En conciliación" |
| 2 | `FA-02_caso-cita-vencida.png` | P-04 | Caso marcado "Cita vencida" |
| 3 | `FA-03_registrar-avance-acuerdo.png` | P-04 | Concluido exige el acuerdo; foto o referencia del acta |
| 4 | `FA-04_campos-modificado.png`, `FA-05_confirmacion-cambios.png` | P-04 | "Modificado", [Deshacer cambios], "Se guardó 1 cambio en la tableta: Observaciones." |

### Flujo complementario B: Computadora

| Paso | Captura | Pantalla | Qué demuestra |
| :--- | :--- | :--- | :--- |
| 1 | `FB-01_pc-aviso-ultimo-envio.png` | P-10 | Datos ya enviados y aviso del último envío |
| 2 | `FB-02_pc-editar-caso.png` | P-10 | Edición desde la computadora (origen del conflicto de P-09) |

### Otras capturas de estado

Barra de estado en las 4 combinaciones (`X-barra-con-internet-todo-enviado.png`, `X-barra-con-internet-pendientes-enviar-ahora.png`, `X-barra-sin-internet-todo-enviado.png`, `X-barra-sin-internet-pendientes.png`), recordatorio de días sin enviar (`?seed=mixed`), batería al 20 % y al 10 %, formulario con letra Grande, aviso "Gire la tableta" (800×1280), introducción P-00b, borradores con "falta: …" en los tres módulos, etiquetas "(opcional)" y líneas condicionales, y versiones anotadas (`?annotate=1`) de P-01, P-03, P-06, P-07 y P-09.

---

## 9. Matriz de justificación

La matriz completa (83 filas, una por elemento concreto) está en **`docs/MATRIZ.md`** (datos en `docs/matriz/matriz.json`). Cada ID coincide con el marcador numerado del modo anotado (`?annotate=1`), de modo que las capturas anotadas de P-01, P-03, P-06, P-07 y P-09 se leen junto con la tabla.

| Pantalla | Filas | IDs |
| :--- | :--- | :--- |
| Global (barra, menú, avisos) | 10 | 1–4, 76–81 |
| P-00 PIN | 3 | 70–72 |
| P-00b Introducción | 3 | 73–75 |
| P-01 Inicio | 6 | 50–55 |
| P-02 Casos: lista | 5 | 10–14 |
| P-03 Caso: nuevo | 8 | 15–22 |
| P-04 Caso: detalle y edición | 7 | 23–29 |
| P-05 Actuaciones: lista | 5 | 30–34 |
| P-06 Actuación | 14 | 35–48 |
| P-07 Agenda y detalle de actividad | 7 | 56–62 |
| P-08 Actividad | 7 | 63–69 |
| P-09 Envío | 5 | 82–86 |
| P-10 Computadora | 3 | 87–89 |

Ejemplos:

| ID | Pantalla | Elemento | Necesidad | Norman | Nielsen | Factor humano | Cómo facilita o previene errores |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2 | Global | "3 registros por enviar" (ámbar) / "Todo enviado" (verde) | Saber si lo registrado ya llegó al Poder Judicial | Feedback | H1; H4 | Carga de memoria de trabajo | El contador sube al guardar y baja al enviar; color, texto e ícono evitan confundir guardado con enviado |
| 19 | P-03 | Rol Solicitante / Invitado / Testigo y "El caso necesita al menos una persona que lo solicite." | Registrar quién pide y quién es citado | Constraints | H5; H6 | Poca experiencia digital | Solo puede elegir roles válidos y no puede dar por completo un caso sin solicitante |
| 85 | P-09 | Conflicto resuelto automáticamente con aviso y [Ver y cambiar] | Reducir trámites mientras las partes esperan | Feedback | H1; H3 | Carga de memoria de trabajo | Evita una decisión campo por campo propensa a errores y deja la opción de revertir |

Revisión de calidad aplicada al unir las filas: se cambió la pantalla de las filas 23 (edición desde P-04), 43, 61 y 62 para que coincida con donde está el marcador, y se reescribió el efecto de las filas 36, 45, 47, 48, 54 y 67 para que se siga causalmente del elemento y no afirme resultados no medidos (por ejemplo, que el dictado "acorta el tiempo").

---

## 10. Evidencia de factores humanos

- **Objetivos táctiles:** `docs/evidencia/objetivos-tactiles.md`. Medición automática con Playwright de todos los botones y controles de cada pantalla, con letra Normal y Grande. Criterio: 48×48 px como mínimo y 8 px o más de separación (WCAG 2.5.5, 44×44 px, solo como piso de referencia). En el código, todos los botones, segmentos y tarjetas usan un mínimo de 48 px (`--touch: 48px`); los botones principales miden 64 px de alto y las teclas del PIN 96×72 px.
- **Contraste:** `docs/evidencia/contraste.md`. Auditoría con axe-core (`@axe-core/playwright`) en cada pantalla, criterio WCAG AA. La paleta usa texto oscuro (#1b1f24) sobre fondo claro y tonos oscuros para los estados (azul #1d4f91, ámbar #7a4a00, verde #1b6b36, rojo #a3161a) sobre fondos suaves, pensando en la lectura al aire libre.

_Ambos archivos los genera el agente de pruebas; al cerrar este informe todavía no estaban en el repositorio. Si falta alguno, esta sección debe completarse con sus tablas antes de entregar._

Otros factores humanos considerados (ver matriz): Ley de Fitts (objetivos de 48 y 64 px), Ley de Hick (menú de 4 opciones, 4 tarjetas de trámite primero), carga de memoria de trabajo (3 pasos, resumen antes de guardar, motivos de atención en texto), legibilidad (texto base de 18 px, fuente Atkinson Hyperlegible empaquetada localmente), tableta apoyada en una mesa (acción principal siempre abajo a la derecha), poca experiencia digital (sin gestos ocultos: nada depende de deslizar ni de mantener presionado), pantalla mostrada a las partes (resumen legible), energía limitada (aviso de batería), presbicia (tamaño de letra) y orientación fija.

---

## 11. Alcance: qué es real y qué es simulado

| Funciona de verdad | Simulado |
| :--- | :--- |
| Guardado en la tableta (`localStorage` del navegador) y persistencia entre sesiones | El servidor del Poder Judicial (capa `api` falsa con latencia y resultado fijados por `scenario`, sin aleatoriedad) |
| Detección de conexión con los eventos `online` / `offline` del navegador | El envío y sus resultados (parcial, error, conflicto) |
| Carga sin Internet tras la primera visita (service worker de `vite-plugin-pwa`, fuentes e íconos empaquetados) | Los conflictos: si no hay una edición real desde P-10, `scenario=conflict` inventa una edición de la computadora en Observaciones |
| Formularios, validaciones, borradores, búsquedas, filtros, contador de pendientes, códigos generados en la tableta | El desbloqueo por código de "¿Olvidó su PIN?" (acepta cualquier código de 6 números) |
| Guardado automático y recuperación tras cerrar o recargar | El nivel de batería (`battery=`), salvo en navegadores con Battery Status API |
| Fotos con la cámara de la tableta (se guardan reducidas) | Los datos de la computadora (P-10) son una copia en la misma tableta, no un servidor real |
| Bloqueo automático tras 5 minutos | Cifrado de los datos locales y borrado remoto de la tableta perdida: **solo diseño, no implementado** |

El dictado por voz depende del teclado del sistema (Gboard con el paquete de español sin conexión), no del prototipo. Lo no enviado se perdería si la tableta se pierde o se daña; por eso existe el recordatorio de días sin enviar.

---

## 12. Limitaciones y trabajo futuro

- **Idioma:** la interfaz está solo en español, aunque muchos jueces de paz y las partes hablan quechua o aimara. Mitigación actual: lenguaje simple, ícono en cada acción y resumen legible antes de guardar para leerlo en voz alta. Trabajo futuro: interfaz y ayudas en quechua y aimara, validadas con usuarios.
- **Solo orientación horizontal:** en vertical se pide girar la tableta.
- **Sin pruebas con usuarios reales:** ninguna decisión está validada todavía con jueces de paz (ver plan en la sección 13).
- **Funciones descritas en el diseño que el prototipo no implementa o implementa parcialmente:**
  - P-10 permite consultar y editar estado y observaciones (o descripción), pero no crear registros ni buscar o filtrar.
  - La versión descartada en un conflicto se guarda en el historial interno del registro, pero ese historial no se muestra en pantalla; solo se puede recuperar con [Ver y cambiar] desde el resultado del envío (y [Ver y cambiar] abre el primer registro en conflicto).
  - El distintivo "Revisar" no se asigna automáticamente (el conflicto se resuelve solo); aparece en los datos semilla `seed=mixed`.
  - El umbral de 15 días de "Requiere atención" es configurable solo en los datos, sin pantalla.
  - En P-08, la fecha y las horas usan los selectores nativos del navegador, no un calendario ni botones de hora propios.
  - Los duplicados con registros del Poder Judicial "al enviar" no se simulan.
  - El parámetro `demo=1` se lee pero no cambia nada.
  - Persistencia en `localStorage` en lugar de IndexedDB (permitido por el diseño, pero con menos capacidad para fotos).
- **Plan B:** ninguna pantalla se entregó como estática o boceto; las 12 pantallas (P-00 a P-10 y P-00b) funcionan.

---

## 13. Plan de evaluación propuesto (DCU)

Plan, no resultados: ninguna de estas pruebas se ha realizado todavía.

**Participantes.** 5 jueces de paz (o, en su defecto, personas con perfil similar: autoridades comunales con poca experiencia digital), de preferencia de zonas rurales y de distintas edades. Consentimiento informado; solo datos ficticios.

**Condiciones.** Tableta de 10" en horizontal, apoyada en una mesa, con el prototipo publicado y datos restablecidos. El Internet se apaga a mitad de la tarea 1 y se enciende en la tarea 4, como en la situación de uso. Sesión individual de unos 45 minutos con protocolo de pensar en voz alta; un moderador y un observador que registra tiempos y errores.

**Tareas (de la situación de uso)**

| Tarea | Consigna | Éxito |
| :--- | :--- | :--- |
| T1 | Registrar el conflicto vecinal de dos personas que llegan juntas (una sin DNI a la mano) | El caso queda guardado con las dos personas, su rol y el solicitante |
| T2 | Atender una solicitud de constancia de posesión y dejarla concluida | La actuación queda Concluida con resultado y fecha de entrega |
| T3 | Decir qué actividades tiene mañana y en qué comunidad | Nombra las actividades correctas sin ayuda |
| T4 | Agendar una reunión con autoridades comunales el jueves por la tarde | La actividad queda guardada sin cruce de horario (o con cruce aceptado a sabiendas) |
| T5 | Enviar lo registrado al Poder Judicial y decir si se envió todo | Confirma el envío y lo explica con sus palabras |
| T6 | Encontrar un caso anterior de "Quispe" y registrar un avance | Encuentra el caso y guarda el avance |
| P1 | Pregunta de comprensión: "¿Dónde está ahora lo que registró sin Internet?" | Responde que está en la tableta y falta enviarlo |

**Métricas**

- Éxito por tarea: completa sin ayuda / completa con ayuda / no completa.
- Tiempo por tarea (desde la consigna hasta que la persona dice que terminó).
- Errores por tarea (toques en el lugar equivocado, datos mal registrados) y veces que pide ayuda.
- Comprensión del estado sin conexión (P1) y de los distintivos "En la tableta" / "Enviado".
- Cuestionario SUS (10 afirmaciones, escala de 1 a 5, puntaje de 0 a 100), leído en voz alta si hace falta.
- Comentarios cualitativos sobre términos que no se entendieron (para el glosario y la futura versión en quechua y aimara).

**Análisis y uso de los resultados.** Se reportarán por tarea el porcentaje de éxito, la mediana de tiempo y los errores más frecuentes, y el SUS promedio con su rango. Las metas de referencia (por ejemplo, éxito sin ayuda en 4 de 5 participantes por tarea y SUS de 68 o más) se fijan antes de la prueba y solo sirven para decidir qué rediseñar; no se sacarán conclusiones sobre la usabilidad hasta tener los datos. Los problemas encontrados se priorizan por gravedad y frecuencia y alimentan una nueva iteración del prototipo, que se volvería a probar.
