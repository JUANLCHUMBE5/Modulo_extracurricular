import { Response } from "express";

const clients = new Set<Response>();

/**
 * Registra un cliente HTTP (conexión SSE abierta) en la lista de receptores activos
 * de eventos de sincronización del bus de datos.
 * Retorna una función para remover al cliente cuando se cierre la conexión.
 * 
 * @param res Objeto Response de Express correspondiente a la conexión SSE del cliente.
 * @returns Función de retorno (limpieza) para eliminar al cliente del set.
 */
export function addSyncClient(res: Response): () => void {
  clients.add(res);
  return () => {
    clients.delete(res);
  };
}

/**
 * Transmite un evento de sincronización en formato Server-Sent Events (SSE)
 * a todos los clientes web activos conectados.
 * Si algún cliente ha cerrado la conexión (falla al escribir), es removido automáticamente.
 * 
 * @param event Objeto del evento de sincronización a transmitir.
 */
export function emitSyncEvent(event: any): void {
  if (!event) return;
  const payload = JSON.stringify(event);
  clients.forEach((res) => {
    try {
      res.write(`event: sync\n`);
      res.write(`data: ${payload}\n\n`);
    } catch {
      clients.delete(res);
    }
  });
}

export interface SyncEventPayload {
  id: string;
  entidades: string[];
  details: any;
  createdAt: string;
}

/**
 * Crea la estructura estandarizada de un evento de sincronización del sistema,
 * consolidando las entidades del base de datos que cambiaron y detalles adicionales.
 * 
 * @param changes Arreglo de nombres de tablas/entidades que fueron modificadas (ej: ["usuarios", "pagos"]).
 * @param details Objeto opcional con metadatos descriptivos de la acción.
 * @returns Objeto de evento de sincronización estructurado o null si no hay cambios reales.
 */
export function createSyncEvent(changes: string[] = [], details: any = {}): SyncEventPayload | null {
  const entidades = Array.from(new Set(changes.filter(Boolean)));
  if (!entidades.length) return null;
  return {
    id: `SYNC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entidades,
    details,
    createdAt: new Date().toISOString(),
  };
}
