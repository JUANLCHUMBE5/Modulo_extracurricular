const clients = new Set();

export function addSyncClient(res) {
  clients.add(res);
  return () => clients.delete(res);
}

export function emitSyncEvent(event) {
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

export function createSyncEvent(changes = [], details = {}) {
  const entidades = Array.from(new Set(changes.filter(Boolean)));
  if (!entidades.length) return null;
  return {
    id: `SYNC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entidades,
    details,
    createdAt: new Date().toISOString(),
  };
}
