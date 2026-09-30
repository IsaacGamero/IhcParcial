// Pasos de los flujos (sección 6) compartidos por flows.spec.ts (aserciones) y captures.spec.ts (capturas).
import { expect, type BrowserContext, type Page } from '@playwright/test';
import { PHOTO, TODAY, bar, fillParty, party, skipIntroIfShown, stable, toast, typePin, url } from './helpers';

export interface ShotMeta {
  pantalla: string;
  flujo: string;
  paso: string;
  demuestra: string;
  criterio: string;
}
export type Snap = (file: string, meta: ShotMeta) => Promise<void>;
export const noSnap: Snap = async () => {};

/** Flujo 1 · Registrar un conflicto vecinal (corte real de conexión a mitad). */
export async function flow1(page: Page, context: BrowserContext, snap: Snap = noSnap, query = '') {
  const F = 'Flujo 1';
  await page.goto(url({ pin: true, query }));
  await stable(page);
  await snap('F1-01a_pin.png', { pantalla: 'P-00', flujo: F, paso: '1', demuestra: 'Ingreso con PIN numérico y teclado grande; funciona sin Internet', criterio: 'Factores humanos y dispositivo' });
  await typePin(page);
  await skipIntroIfShown(page);
  const b = bar(page);
  await expect(b.net).toHaveText('Con Internet');
  await expect(b.data).toHaveText('Todo enviado');
  await stable(page);
  await snap('F1-01b_inicio-con-internet.png', { pantalla: 'P-01', flujo: F, paso: '1', demuestra: 'Inicio con barra "Con Internet" · "Todo enviado"', criterio: 'Funcionamiento sin conexión' });

  await page.getByTestId('home-new-case').click();
  await expect(page.getByText('Paso 1 de 3')).toBeVisible();
  await page.getByRole('button', { name: /^Problemas entre vecinos/ }).click();
  await page.getByTestId('case-description').fill('El vecino cerró el paso al canal de riego con un cerco de piedras.');
  await page.getByTestId('case-description').blur();
  await expect(page.getByTestId('autosave-status')).toHaveText('Guardado automáticamente hace un momento');
  await snap('F1-02_nuevo-caso-paso1.png', { pantalla: 'P-03', flujo: F, paso: '2', demuestra: 'Paso 1 "El problema": tipo con botones grandes, descripción con ayuda de dictado y guardado automático', criterio: 'Cobertura y funcionamiento de los módulos' });

  await context.setOffline(true);
  const notice = page.getByTestId('offline-notice');
  await expect(notice).toContainText('Se perdió el Internet.');
  await expect(notice).toContainText('Lo que escribe se sigue guardando en la tableta.');
  await expect(b.net).toHaveText('Sin Internet · puede seguir trabajando');
  await expect(b.net).toHaveClass(/t-gray/);
  await snap('F1-03_aviso-corte-internet.png', { pantalla: 'P-03', flujo: F, paso: '3', demuestra: 'Corte real de Internet a mitad del formulario: aviso gris y barra "Sin Internet"', criterio: 'Funcionamiento sin conexión' });

  await page.getByTestId('step-next').click();
  await expect(page.getByText('Paso 2 de 3')).toBeVisible();
  await fillParty(party(page, 1), { rol: 'Solicitante', nombre: 'Juan Quispe Mamani', doc: 'No lo tiene a la mano', comunidad: 'Huayllay' });
  await expect(page.getByRole('dialog', { name: '¿Es la misma persona?' })).toHaveCount(0);
  await snap('F1-04_parte1-solicitante.png', { pantalla: 'P-03', flujo: F, paso: '4', demuestra: 'Parte 1 con rol, patrón "No lo tiene a la mano" y comunidad, sin Internet', criterio: 'Cobertura y funcionamiento de los módulos' });

  await fillParty(party(page, 2), { nombre: 'María Condori Huamán' });
  const dup = page.getByRole('dialog', { name: '¿Es la misma persona?' });
  await expect(dup).toBeVisible();
  await expect(dup).toContainText('María Condori Huamán');
  await expect(dup).toContainText('NOT-TAB01-202604-0003');
  await snap('F1-05a_advertencia-duplicado.png', { pantalla: 'P-03', flujo: F, paso: '5', demuestra: 'Advertencia de duplicado (regla 5.3) que no bloquea', criterio: 'Principios de diseño y heurísticas' });
  await dup.getByRole('button', { name: 'Es la misma persona: usar sus datos' }).click();
  await expect(dup).toHaveCount(0);
  await expect(party(page, 2).getByLabel('Comunidad o localidad')).toHaveValue('Huayllay');
  await snap('F1-05b_datos-reutilizados.png', { pantalla: 'P-03', flujo: F, paso: '5', demuestra: 'Se reutilizan los datos de la persona ya registrada', criterio: 'Principios de diseño y heurísticas' });

  await page.getByTestId('step-next').click();
  await expect(page.getByText('Paso 2 de 3')).toBeVisible();
  const rolErr = party(page, 2).locator('.err', { hasText: 'Elija qué papel tiene esta persona.' });
  await expect(rolErr).toBeVisible();
  await snap('F1-06_error-sin-rol.png', { pantalla: 'P-03', flujo: F, paso: '6', demuestra: 'Error de validación en lenguaje simple junto al campo', criterio: 'Principios de diseño y heurísticas' });
  await fillParty(party(page, 2), { rol: 'Invitado' });
  await expect(rolErr).toHaveCount(0);

  await page.getByTestId('step-next').click();
  await expect(page.getByText('Paso 3 de 3')).toBeVisible();
  await page.getByTestId('next-date').fill('2026-05-19');
  await page.getByTestId('next-time').fill('10:00');
  const summary = page.getByTestId('case-summary');
  await expect(summary).toContainText('Juan Quispe Mamani · Solicitante');
  await expect(summary).toContainText('María Condori Huamán · Invitado');
  await expect(summary).toContainText('19/05, 10:00');
  await snap('F1-07_resumen-proxima-cita.png', { pantalla: 'P-03', flujo: F, paso: '7', demuestra: 'Próxima cita 19/05 10:00 y resumen legible antes de guardar', criterio: 'Cobertura y funcionamiento de los módulos' });

  await page.getByTestId('save-case').click();
  await expect(toast(page, 'Caso JZ04-TAB01-202605-0013 guardado en la tableta')).toBeVisible();
  await expect(toast(page, 'También se agendó: Audiencia, 19/05, 10:00')).toBeVisible();
  await expect(toast(page, 'Caso JZ04-TAB01-202605-0013').locator('[data-sync="local"]')).toHaveText('En la tableta');
  await expect(b.data).toHaveText('2 registros por enviar');
  await expect(page.getByTestId('case-code')).toHaveText('JZ04-TAB01-202605-0013');
  await stable(page);
  await snap('F1-08_confirmacion-guardado.png', { pantalla: 'P-04', flujo: F, paso: '8', demuestra: 'Confirmación "guardado en la tableta" + "También se agendó" y barra "2 registros por enviar"', criterio: 'Funcionamiento sin conexión' });
}

/** Flujo 2 · Actuación notarial con cierre inesperado (recarga) y recuperación. */
export async function flow2(page: Page, snap: Snap = noSnap, expectedPending = 3) {
  const F = 'Flujo 2';
  await page.locator('.sidenav').getByRole('link', { name: 'Inicio' }).click();
  await page.getByTestId('home-new-act').click();
  await expect(page.getByText('Paso 1 de 3')).toBeVisible();
  await page.getByRole('button', { name: /^Constancia de que ocupa un terreno/ }).click();
  await page.getByTestId('act-asunto').fill('Constancia de posesión de la chacra "Pampa Alta" para trámite de agua.');
  await page.getByTestId('act-asunto').blur();
  await snap('F2-01_tipo-y-asunto.png', { pantalla: 'P-06', flujo: F, paso: '1', demuestra: 'Tipo en lenguaje cotidiano (4 tarjetas + Ver más) y asunto', criterio: 'Cobertura y funcionamiento de los módulos' });
  await page.getByTestId('step-next').click();
  await expect(page.getByText('Paso 2 de 3')).toBeVisible();
  await fillParty(party(page, 1), { nombre: 'Tomás Yupanqui Rojas', doc: 'No tiene', comunidad: 'Chipipata' });
  await expect(page.getByRole('dialog', { name: '¿Es la misma persona?' })).toHaveCount(0);
  await expect(page.getByTestId('autosave-status')).toHaveText('Guardado automáticamente hace un momento');
  await snap('F2-02_solicitante.png', { pantalla: 'P-06', flujo: F, paso: '2', demuestra: 'Solicitante agregado sin duplicados; guardado automático', criterio: 'Cobertura y funcionamiento de los módulos' });

  // La aplicación se cierra y se vuelve a abrir.
  await page.reload();
  await stable(page);
  const rec = page.getByRole('dialog', { name: /Tenía una actuación sin terminar/ });
  await expect(rec).toBeVisible();
  await expect(rec).toContainText('¿Desea continuar?');
  await snap('F2-03a_recuperacion.png', { pantalla: 'P-06', flujo: F, paso: '3', demuestra: 'Recuperación tras cierre inesperado: "Tenía una actuación sin terminar. ¿Desea continuar?"', criterio: 'Funcionamiento sin conexión' });
  await rec.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('Paso 2 de 3')).toBeVisible();
  await expect(party(page, 1).getByLabel('Nombres y apellidos')).toHaveValue('Tomás Yupanqui Rojas');
  await snap('F2-03b_continua-paso2.png', { pantalla: 'P-06', flujo: F, paso: '3', demuestra: 'Continúa en el mismo paso con los datos recuperados', criterio: 'Funcionamiento sin conexión' });

  await page.getByTestId('step-next').click();
  await expect(page.getByText('Paso 3 de 3')).toBeVisible();
  await page.getByTestId('act-state-Atendida').click();
  await expect(page.getByTestId('act-fat')).toHaveValue(TODAY);
  await page.getByTestId('act-state-Concluida').click();
  const msg = page.getByText('Para concluir, escriba qué se entregó o qué constancia se emitió.');
  await expect(msg).toBeVisible();
  await expect(page.getByTestId('act-record')).toContainText('Borrador');
  await snap('F2-04_error-concluida-sin-resultado.png', { pantalla: 'P-06', flujo: F, paso: '4', demuestra: 'Condicional: Concluida sin resultado → mensaje; líneas "Se pide cuando…"; Borrador', criterio: 'Principios de diseño y heurísticas' });

  await page.getByTestId('act-resultado').fill('Se emitió la constancia de posesión n.° 7.');
  await page.getByTestId('act-fent').fill(TODAY);
  await expect(msg).toHaveCount(0);
  await expect(page.getByTestId('act-record')).toHaveText('Completo');
  await snap('F2-05_completo.png', { pantalla: 'P-06', flujo: F, paso: '5', demuestra: 'Resultado y fecha de entrega → el registro pasa de Borrador a Completo', criterio: 'Cobertura y funcionamiento de los módulos' });

  await page.getByTestId('save-act').click();
  await expect(toast(page, /Actuación NOT-TAB01-202605-0007 guardada en la tableta/)).toBeVisible();
  await expect(bar(page).data).toHaveText(`${expectedPending} registros por enviar`);
  await stable(page);
  await snap('F2-06_confirmacion-guardado.png', { pantalla: 'P-06', flujo: F, paso: '6', demuestra: `Confirmación en la tableta; barra "${expectedPending} registros por enviar"`, criterio: 'Funcionamiento sin conexión' });
}

/** Flujo 4 · Agendar una reunión (cruce) y enviar todo al volver el Internet. */
export async function flow4(page: Page, context: BrowserContext, snap: Snap = noSnap, total = 4) {
  const F = 'Flujo 4';
  await page.locator('.sidenav').getByRole('link', { name: 'Inicio' }).click();
  await page.getByTestId('home-new-activity').click();
  await page.getByTestId('activity-title').fill('Reunión con autoridades comunales');
  await page.getByRole('group', { name: 'Tipo de actividad' }).getByRole('button', { name: 'Reunión', exact: true }).click();
  await page.getByTestId('activity-date').fill('2026-05-14');
  await page.getByTestId('activity-start').fill('15:00');
  await page.getByTestId('activity-end').fill('16:00');
  await page.getByRole('group', { name: 'Lugar o comunidad' }).getByRole('button', { name: 'Huayllay', exact: true }).click();
  await snap('F4-01_nueva-actividad.png', { pantalla: 'P-08', flujo: F, paso: '1', demuestra: 'Reunión con autoridades comunales, jueves 14/05 15:00–16:00, Huayllay', criterio: 'Cobertura y funcionamiento de los módulos' });

  await page.getByTestId('save-activity').click();
  const ov = page.getByRole('dialog', { name: 'Cruce de horario' });
  await expect(ov).toBeVisible();
  await expect(page.getByTestId('overlap-text')).toHaveText('A esa hora ya tiene: Visita a Huayllay. ¿Agendar igual?');
  await snap('F4-02a_cruce-horario.png', { pantalla: 'P-08', flujo: F, paso: '2', demuestra: 'Aviso no bloqueante de cruce de horario con la otra actividad', criterio: 'Principios de diseño y heurísticas' });
  await page.getByTestId('overlap-change').click();
  await expect(ov).toHaveCount(0);
  await page.getByTestId('activity-start').fill('16:30');
  await page.getByTestId('activity-end').fill('17:30');
  await snap('F4-02b_hora-ajustada.png', { pantalla: 'P-08', flujo: F, paso: '2', demuestra: 'Hora ajustada a 16:30–17:30', criterio: 'Cobertura y funcionamiento de los módulos' });

  await page.getByTestId('save-activity').click();
  await expect(toast(page, 'Actividad guardada en la tableta')).toBeVisible();
  await expect(bar(page).data).toHaveText(`${total} registros por enviar`);
  await expect(page.getByTestId('agenda-day')).toContainText('Reunión con autoridades comunales');
  await stable(page);
  await snap('F4-03_guardado-por-enviar.png', { pantalla: 'P-07', flujo: F, paso: '3', demuestra: `Guardada; barra "${total} registros por enviar"`, criterio: 'Funcionamiento sin conexión' });

  // Vuelve el Internet: envío automático.
  await context.setOffline(false);
  await expect(bar(page).net).toHaveText('Con Internet');
  const prog = page.getByTestId('sync-progress');
  await expect(prog).toContainText(`Enviando 2 de ${total}…`);
  await snap('F4-04_progreso-envio.png', { pantalla: 'P-09', flujo: F, paso: '4', demuestra: 'Envío automático al volver el Internet con progreso "Enviando n de 4…"', criterio: 'Funcionamiento sin conexión' });
  const res = page.getByTestId('sync-result');
  await expect(res).toHaveText(`Se enviaron los ${total} registros. Todo está guardado en el Poder Judicial.`, { timeout: 20_000 });
  await expect(bar(page).data).toHaveText('Todo enviado');
  await expect(bar(page).net).toHaveText('Con Internet');
  await expect(page.getByTestId('sync-list').locator('[data-sync="sent"]')).toHaveCount(total);
  await expect(page.getByTestId('sync-list').locator('[data-sync="local"]')).toHaveCount(0);
  await stable(page);
  await snap('F4-05a_exito-todo-enviado.png', { pantalla: 'P-09', flujo: F, paso: '5', demuestra: `"Se enviaron los ${total} registros" y barra "Todo enviado"; distintivos "Enviado"`, criterio: 'Funcionamiento sin conexión' });
  await page.locator('.sidenav').getByRole('link', { name: 'Casos' }).click();
  const row = page.getByTestId('case-row').filter({ hasText: 'JZ04-TAB01-202605-0013' });
  await expect(row.locator('[data-sync]')).toHaveText('Enviado');
  await snap('F4-05b_distintivos-enviado.png', { pantalla: 'P-02', flujo: F, paso: '5', demuestra: 'El caso del Flujo 1 pasa a "Enviado" en la lista', criterio: 'Funcionamiento sin conexión' });
}

/** Flujo 3 · Revisar las actividades de la semana. */
export async function flow3(page: Page, snap: Snap = noSnap) {
  const F = 'Flujo 3';
  await page.goto(url());
  await stable(page);
  const tm = page.getByTestId('home-tomorrow');
  await expect(tm).toContainText('Mañana: 2 actividades');
  await snap('F3-01_inicio-manana.png', { pantalla: 'P-01', flujo: F, paso: '1', demuestra: 'Aviso de próximas "Mañana: 2 actividades" en Inicio', criterio: 'Cobertura y funcionamiento de los módulos' });
  await page.locator('.sidenav').getByRole('link', { name: 'Agenda' }).click();
  await page.getByTestId('view-semana').click();
  await expect(page.getByTestId('view-semana')).toHaveAttribute('aria-pressed', 'true');
  const week = page.getByTestId('agenda-week');
  await expect(week).toBeVisible();
  await expect(week.getByText('Visita a comunidad').first()).toBeVisible();
  await expect(week.getByText('Cancelada').first()).toBeVisible();
  await stable(page);
  await snap('F3-02_agenda-semana.png', { pantalla: 'P-07', flujo: F, paso: '2', demuestra: 'Vista Semana: categorías con color + ícono + texto y estados', criterio: 'Cobertura y funcionamiento de los módulos' });
  await page.getByTestId('day-cell-2026-05-13').click();
  await expect(page.getByTestId('view-dia')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('agenda-period')).toHaveText('miércoles 13 de mayo');
  const day = page.getByTestId('agenda-day');
  await expect(day.getByTestId('activity-item')).toHaveCount(2);
  await snap('F3-03a_agenda-dia-miercoles.png', { pantalla: 'P-07', flujo: F, paso: '3', demuestra: 'Vista Día del miércoles con detalle', criterio: 'Cobertura y funcionamiento de los módulos' });
  await day.getByTestId('activity-item').filter({ hasText: 'Audiencia de alimentos' }).click();
  const link = page.getByTestId('activity-link');
  await expect(link).toContainText('Creada desde el caso JZ04-TAB01-202605-0011');
  await snap('F3-03b_detalle-vinculo-caso.png', { pantalla: 'P-08', flujo: F, paso: '3', demuestra: 'Detalle de la actividad con vínculo al caso', criterio: 'Cobertura y funcionamiento de los módulos' });
  await link.getByRole('link', { name: 'JZ04-TAB01-202605-0011' }).click();
  await expect(page.getByTestId('case-code')).toHaveText('JZ04-TAB01-202605-0011');
}

/** Flujo complementario A · Actualizar el avance de un caso. */
export async function flowA(page: Page, snap: Snap = noSnap) {
  const F = 'Flujo A';
  await page.goto(url({ hash: '/casos' }));
  await stable(page);
  await page.getByTestId('case-search').fill('Quispe');
  await page.getByTestId('filter-estado-En conciliación').click();
  const rows = page.getByTestId('case-row');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Cita vencida');
  await snap('FA-01_busqueda-filtro.png', { pantalla: 'P-02', flujo: F, paso: '1', demuestra: 'Búsqueda "Quispe" + filtro En conciliación; motivo de atención en texto', criterio: 'Cobertura y funcionamiento de los módulos' });
  await rows.first().click();
  await expect(page.getByTestId('case-code')).toHaveText('JZ04-TAB01-202604-0007');
  await expect(page.locator('.caso-detail .badge', { hasText: 'Cita vencida' })).toBeVisible();
  await snap('FA-02_caso-cita-vencida.png', { pantalla: 'P-04', flujo: F, paso: '2', demuestra: 'Detalle con "Cita vencida", distintivo, partes, historial', criterio: 'Cobertura y funcionamiento de los módulos' });

  await page.getByTestId('register-advance').click();
  const dlg = page.getByRole('dialog', { name: 'Registrar avance' });
  await dlg.getByTestId('advance-text').fill('Reunión de conciliación: acuerdan turnos de riego alternos.');
  await dlg.getByRole('group', { name: 'Nuevo estado' }).getByRole('button', { name: 'Concluido' }).click();
  await snap('FA-03a_registrar-avance.png', { pantalla: 'P-04', flujo: F, paso: '3', demuestra: 'Ventana "Registrar avance" con condicional de acuerdo al pasar a Concluido', criterio: 'Cobertura y funcionamiento de los módulos' });
  await dlg.getByTestId('advance-save').click();
  await expect(dlg.getByText('Para cerrar el caso, escriba el acuerdo o resultado.')).toBeVisible();
  await snap('FA-03b_exige-acuerdo.png', { pantalla: 'P-04', flujo: F, paso: '3', demuestra: 'Concluido exige el acuerdo (mensaje en lenguaje simple)', criterio: 'Principios de diseño y heurísticas' });
  await dlg.getByTestId('advance-result').fill('Turnos de riego lunes/miércoles para Pedro y martes/jueves para Rosa.');
  await dlg.getByTestId('photo-input').setInputFiles(PHOTO);
  await expect(dlg.locator('.casos-thumb')).toHaveCount(1);
  await dlg.getByTestId('advance-ref').fill('Acta en cuaderno 3, folio 12');
  await snap('FA-03c_foto-acta.png', { pantalla: 'P-04', flujo: F, paso: '3', demuestra: 'Acuerdo escrito y foto del acta adjunta + referencia física', criterio: 'Cobertura y funcionamiento de los módulos' });
  await dlg.getByTestId('advance-save').click();
  await expect(toast(page, 'Avance guardado en la tableta')).toBeVisible();
  await expect(page.getByTestId('case-result')).toContainText('Turnos de riego');
  await expect(page.locator('.casos-evid-item')).toHaveCount(2);

  await page.getByTestId('edit-case').click();
  const obs = page.getByTestId('case-observaciones');
  const field = page.locator('.field[data-field="Observaciones"]');
  await obs.fill('Las partes piden revisar el acuerdo en junio.');
  await expect(field.locator('.mod-tag')).toHaveText('Modificado');
  await expect(obs).toHaveClass(/modified/);
  await snap('FA-04a_modificado.png', { pantalla: 'P-03', flujo: F, paso: '4', demuestra: 'Campo editado resaltado con "Modificado" y botón [Deshacer cambios]', criterio: 'Principios de diseño y heurísticas' });
  await page.getByTestId('undo-changes').click();
  await expect(obs).toHaveValue('');
  await expect(field.locator('.mod-tag')).toHaveCount(0);
  await snap('FA-04b_deshacer.png', { pantalla: 'P-03', flujo: F, paso: '4', demuestra: '[Deshacer cambios] devuelve el valor original', criterio: 'Principios de diseño y heurísticas' });
  await obs.fill('Revisar el cumplimiento del acuerdo en junio.');
  await page.getByTestId('save-changes').click();
  await expect(toast(page, 'Se guardó 1 cambio en la tableta: Observaciones.')).toBeVisible();
  await stable(page);
  await snap('FA-04c_confirmacion-cambios.png', { pantalla: 'P-04', flujo: F, paso: '4', demuestra: '"Se guardó 1 cambio en la tableta: Observaciones."', criterio: 'Funcionamiento sin conexión' });
}

/** Flujo complementario B · Computadora (P-10). */
export async function flowB(page: Page, snap: Snap = noSnap) {
  const F = 'Flujo B';
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url({ query: 'device=pc' }));
  await stable(page);
  const n = page.getByTestId('pc-notice');
  await expect(n).toHaveText('La tableta envió datos por última vez el 11/05 a las 18:40. Lo que registró después aún no aparece aquí.');
  await expect(page.getByText(/por enviar/)).toHaveCount(0);
  await expect(page.getByTestId('sb-data')).toHaveCount(0);
  await snap('FB-01_computadora-aviso.png', { pantalla: 'P-10', flujo: F, paso: '1', demuestra: 'Vista en computadora 1440×900 con aviso del último envío; no afirma pendientes de la tableta', criterio: 'Funcionamiento sin conexión' });
  const row = page.getByTestId('pc-case-row').filter({ hasText: 'JZ04-TAB01-202605-0012' });
  await row.click();
  const dlg = page.getByRole('dialog', { name: 'JZ04-TAB01-202605-0012' });
  await dlg.getByTestId('pc-edit-text').fill('Las partes pidieron cambiar la fecha de la audiencia.');
  await snap('FB-02_editar-caso.png', { pantalla: 'P-10', flujo: F, paso: '2', demuestra: 'Edición de un caso desde la computadora (origen de conflicto)', criterio: 'Cobertura y funcionamiento de los módulos' });
  await dlg.getByTestId('pc-edit-save').click();
  await expect(toast(page, 'Cambios guardados en el Poder Judicial.')).toBeVisible();
  await expect(row).toContainText('Las partes pidieron cambiar la fecha de la audiencia.');
  await snap('FB-03_guardado-computadora.png', { pantalla: 'P-10', flujo: F, paso: '2', demuestra: 'Cambio guardado en el Poder Judicial', criterio: 'Cobertura y funcionamiento de los módulos' });
}

/** Variantes del envío (scenario=): 4 registros por enviar en la semilla "mixed". */
export async function syncVariant(page: Page, scenario: 'sync-partial' | 'sync-error' | 'conflict', snap: Snap = noSnap) {
  await page.goto(url({ query: `seed=mixed&scenario=${scenario}` }));
  await stable(page);
  await expect(bar(page).data).toHaveText('4 registros por enviar');
  await bar(page).send.click();
  const res = page.getByTestId('sync-result');
  await expect(res).toBeVisible({ timeout: 20_000 });
  const meta = { pantalla: 'P-09', flujo: 'Flujo 4', paso: '6' };
  if (scenario === 'sync-partial') {
    await expect(res).toHaveAttribute('data-status', 'partial');
    await expect(res).toContainText('Se enviaron 2 de 4. Se cortó el Internet. Los otros 2 siguen seguros en la tableta.');
    await expect(page.getByTestId('sync-retry')).toBeVisible();
    await expect(bar(page).data).toHaveText('2 registros por enviar');
    await stable(page);
    await snap('F4-06a_fallo-parcial.png', { ...meta, demuestra: 'Fallo parcial: "Se enviaron 2 de 4…" con [Reintentar]', criterio: 'Funcionamiento sin conexión' });
  } else if (scenario === 'sync-error') {
    await expect(res).toHaveAttribute('data-status', 'error');
    await expect(res).toContainText('El Poder Judicial no respondió. Sus 4 registros siguen seguros en la tableta. Intente más tarde.');
    await expect(res).toHaveClass(/t-red/);
    await expect(page.getByTestId('sync-retry')).toBeVisible();
    await expect(bar(page).data).toHaveText('4 registros por enviar');
    await stable(page);
    await snap('F4-06b_error-servidor.png', { ...meta, demuestra: 'Error del servidor: registros seguros en la tableta, [Reintentar]', criterio: 'Funcionamiento sin conexión' });
  } else {
    await expect(res).toHaveAttribute('data-status', 'conflict');
    await expect(res).toContainText('Se enviaron los 4 registros. Todo está guardado en el Poder Judicial.');
    await expect(page.getByTestId('sync-conflict')).toContainText('Se usó la versión de la computadora del 12/05 en: Observaciones.');
    await expect(bar(page).data).toHaveText('Todo enviado');
    await stable(page);
    await snap('F4-06c_conflicto-resuelto.png', { ...meta, demuestra: 'Conflicto resuelto automáticamente con el cambio más reciente y aviso del campo', criterio: 'Funcionamiento sin conexión' });
    await page.getByTestId('sync-view-change').click();
    const dlg = page.getByRole('dialog');
    await expect(dlg.getByTestId('conflict-use-tablet')).toBeVisible();
    await expect(dlg.getByTestId('conflict-use-pc')).toHaveAttribute('aria-pressed', 'true');
    await snap('F4-06d_ver-y-cambiar.png', { ...meta, demuestra: '[Ver y cambiar]: comparación por campo tableta / computadora', criterio: 'Funcionamiento sin conexión' });
    await dlg.getByTestId('conflict-use-tablet').click();
    await dlg.getByTestId('conflict-save').click();
    await expect(dlg).toHaveCount(0);
    await expect(bar(page).data).toHaveText('Todo enviado', { timeout: 15_000 });
  }
}
