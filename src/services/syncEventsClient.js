import { API_BASE_URL, isApiMode } from "./apiClient";

const SYNC_DEBOUNCE_MS = 1000;

export function startSyncEventsClient({ getToken } = {}) {
  if (!isApiMode() || typeof window === "undefined" || typeof EventSource === "undefined") {
    return () => {};
  }

  const token = getToken?.() || window.sessionStorage.getItem("san_rafael_token") || "";
  if (!token) return () => {};

  let debounceId = 0;
  let pendingEvent = null;
  let stopped = false;

  const dispatchUpdate = (eventPayload) => {
    window.dispatchEvent(new CustomEvent("api-db-updated", {
      detail: {
        source: "sync-events",
        event: eventPayload,
        entidades: eventPayload?.entidades || [],
      },
    }));
  };

  const flush = () => {
    window.clearTimeout(debounceId);
    debounceId = 0;
    if (!pendingEvent || stopped) return;
    const eventPayload = pendingEvent;
    pendingEvent = null;
    dispatchUpdate(eventPayload);
  };

  const schedule = (eventPayload) => {
    pendingEvent = eventPayload;
    window.clearTimeout(debounceId);

    if (document.visibilityState !== "visible") {
      return;
    }

    debounceId = window.setTimeout(flush, SYNC_DEBOUNCE_MS);
  };

  const handleVisibility = () => {
    if (document.visibilityState === "visible" && pendingEvent) {
      flush();
    }
  };

  const url = `${API_BASE_URL}/api/v1/sync/events/stream?token=${encodeURIComponent(token)}`;
  const source = new EventSource(url);

  source.addEventListener("sync", (message) => {
    try {
      schedule(JSON.parse(message.data));
    } catch {
      schedule({ entidades: ["global"], createdAt: new Date().toISOString() });
    }
  });

  document.addEventListener("visibilitychange", handleVisibility);

  return () => {
    stopped = true;
    window.clearTimeout(debounceId);
    document.removeEventListener("visibilitychange", handleVisibility);
    source.close();
  };
}
