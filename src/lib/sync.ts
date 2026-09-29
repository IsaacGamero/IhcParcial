// Envío al Poder Judicial (simulado). IMPLEMENTACIÓN: agente de envío (P-09).
// Contrato: startSync() inicia el envío de pendingRecords() y actualiza db.syncRun.
export function startSync(): void {
  window.location.hash = '/envio';
}
